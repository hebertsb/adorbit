-- ============================================================================
-- ms-campanas | PostgreSQL (Supabase) | DDD | Proyecto Supabase #1
-- Dueno de: campanas, presupuestos, calendario de medios, ORQUESTACION DE SAGA
-- NOTA: consolidado a partir del script del companero + correcciones de revision.
--       Comparar con el script original antes de reemplazarlo.
-- IDs compartidos entre servicios: UUID (texto en Mongo/Dynamo).
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_actualizado_en() RETURNS trigger AS $$
BEGIN NEW.actualizado_en = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------- campanas
CREATE TABLE campanas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL,                       -- logico: ms-clientes-crm
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  estado VARCHAR(25) NOT NULL DEFAULT 'borrador'
    CHECK (estado IN ('borrador','pendiente_aprobacion','pendiente','activa',
                      'pausada','finalizada','cancelada','rechazada')),
  fecha_inicio DATE,
  fecha_fin DATE,
  version INT NOT NULL DEFAULT 1,                 -- control de conflictos offline
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (fecha_fin IS NULL OR fecha_inicio IS NULL OR fecha_fin >= fecha_inicio)
);
CREATE INDEX indice_campanas_cliente ON campanas (cliente_id);
CREATE INDEX indice_campanas_estado  ON campanas (estado);

-- ------------------------------------------------------------- presupuestos
-- (se elimino campanas.presupuesto_id para evitar la referencia circular)
CREATE TABLE presupuestos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campana_id UUID NOT NULL REFERENCES campanas(id),
  monto_total NUMERIC(14,2) NOT NULL CHECK (monto_total >= 0),
  monto_gastado NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (monto_gastado >= 0),
  moneda CHAR(3) NOT NULL DEFAULT 'BOB' CHECK (moneda IN ('BOB','USD')),
  estado VARCHAR(15) NOT NULL DEFAULT 'borrador'
    CHECK (estado IN ('borrador','reservado','liberado','consumido')),
  version INT NOT NULL DEFAULT 1,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (monto_gastado <= monto_total)
);
-- un presupuesto vigente por campana
CREATE UNIQUE INDEX unico_presupuesto_vigente ON presupuestos (campana_id)
  WHERE estado IN ('borrador','reservado','consumido');

-- --------------------------------------------------------- calendario_medios
CREATE TABLE calendario_medios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campana_id UUID NOT NULL REFERENCES campanas(id),
  medio VARCHAR(20) NOT NULL
    CHECK (medio IN ('tv','radio','digital','redes','vallas','prensa')),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  costo NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (costo >= 0),
  estado VARCHAR(15) NOT NULL DEFAULT 'planificado'
    CHECK (estado IN ('planificado','confirmado','ejecutado','cancelado')),
  version INT NOT NULL DEFAULT 1,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (fecha_fin >= fecha_inicio)
);
CREATE INDEX indice_calendario_campana ON calendario_medios (campana_id);

-- ------------------------------------------------------------------- SAGA
CREATE TABLE saga_transacciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campana_id UUID NOT NULL REFERENCES campanas(id),
  clave_idempotencia VARCHAR(100) NOT NULL,          -- la del request original
  estado VARCHAR(30) NOT NULL DEFAULT 'iniciada'
    CHECK (estado IN ('iniciada','reservando_presupuesto','reservando_credito',
                      'bloqueando_piezas','facturando','completada',
                      'compensando','compensada','rechazada','fallida')),
  paso_actual INT NOT NULL DEFAULT 1,
  motivo_fallo TEXT,
  carga JSONB,                                  -- datos globales de la SAGA
  version INT NOT NULL DEFAULT 1,                 -- optimistic locking
  limite_en TIMESTAMPTZ NOT NULL DEFAULT now() + interval '10 minutes',
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clave_idempotencia)
);
-- solo una SAGA activa por campana
CREATE UNIQUE INDEX unico_saga_activa_por_campana ON saga_transacciones (campana_id)
  WHERE estado IN ('iniciada','reservando_presupuesto','reservando_credito',
                   'bloqueando_piezas','facturando','compensando');
-- para el job que compensa SAGAs colgadas
CREATE INDEX indice_saga_pendientes ON saga_transacciones (limite_en)
  WHERE estado NOT IN ('completada','compensada','rechazada','fallida');

CREATE TABLE saga_pasos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saga_id UUID NOT NULL REFERENCES saga_transacciones(id) ON DELETE CASCADE,
  orden INT NOT NULL,
  tipo VARCHAR(12) NOT NULL CHECK (tipo IN ('accion','compensacion')),
  servicio VARCHAR(50) NOT NULL,                  -- 'ms-clientes-crm', ...
  accion VARCHAR(50) NOT NULL,                    -- 'reservar_credito', ...
  clave_comando VARCHAR(120) NOT NULL,              -- 'sagaId:orden:tipo'
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','enviado','exitoso','fallido')),
  intentos INT NOT NULL DEFAULT 0,
  detalle JSONB,                                  -- ids de reserva, error, etc.
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (saga_id, orden, tipo),
  UNIQUE (clave_comando)
);
CREATE INDEX indice_saga_pasos_saga ON saga_pasos (saga_id);

-- ------------------------------------------------- idempotencia y outbox
CREATE TABLE claves_idempotencia (
  clave VARCHAR(120) PRIMARY KEY,                   -- header Idempotency-Key
  huella_solicitud CHAR(64) NOT NULL,                 -- sha256 del cuerpo
  estado VARCHAR(12) NOT NULL DEFAULT 'EN_CURSO'
    CHECK (estado IN ('EN_CURSO','COMPLETADO')),
  codigo_estado INT,
  respuesta JSONB,                                 -- respuesta a reenviar
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  vence_en TIMESTAMPTZ NOT NULL DEFAULT now() + interval '14 days'
);
CREATE INDEX indice_idem_expira ON claves_idempotencia (vence_en);

CREATE TABLE bandeja_salida_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- = id_evento (dedupe del consumidor)
  secuencia BIGSERIAL,                                  -- orden de publicacion
  tipo_agregado VARCHAR(40) NOT NULL,
  agregado_id UUID NOT NULL,
  tipo_evento VARCHAR(80) NOT NULL,
  carga JSONB NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  publicado_en TIMESTAMPTZ
);
CREATE INDEX indice_bandeja_pendientes ON bandeja_salida_eventos (secuencia) WHERE publicado_en IS NULL;

-- ------------------------------------------------ triggers y seguridad
CREATE TRIGGER disparador_campanas_upd  BEFORE UPDATE ON campanas
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();
CREATE TRIGGER disparador_presup_upd    BEFORE UPDATE ON presupuestos
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();
CREATE TRIGGER disparador_calendario_upd BEFORE UPDATE ON calendario_medios
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();
CREATE TRIGGER disparador_saga_upd      BEFORE UPDATE ON saga_transacciones
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();
CREATE TRIGGER disparador_saga_pasos_upd BEFORE UPDATE ON saga_pasos
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

-- Supabase expone las tablas por su API: activar RLS en TODAS
ALTER TABLE campanas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendario_medios  ENABLE ROW LEVEL SECURITY;
ALTER TABLE saga_transacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE saga_pasos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE claves_idempotencia   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bandeja_salida_eventos     ENABLE ROW LEVEL SECURITY;
-- El microservicio se conecta con el rol de la base (postgres/service), que omite RLS.

-- Regla de uso: cada cambio de estado de la SAGA y su fila en bandeja_salida_eventos
-- se guardan en la MISMA transaccion.

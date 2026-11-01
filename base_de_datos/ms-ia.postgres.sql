-- ============================================================================
-- ms-ia | PostgreSQL (Supabase) | Clean Architecture | Proyecto Supabase #2
-- Dueno de: read model de reportes (alimentado por eventos), agentes, modelos ML,
--           auditoria del servidor MCP, resultados de vision (DL).
-- NOTA: consolidado a partir del script del companero + correcciones de revision.
--       Las columnas de reporte_* son una propuesta: ajustar a los eventos reales.
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_actualizado_en() RETURNS trigger AS $$
BEGIN NEW.actualizado_en = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

-- ------------------------------------------------ read model (por eventos)
CREATE TABLE reporte_campanas (
  campana_id UUID PRIMARY KEY,
  cliente_id UUID NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  estado VARCHAR(25) NOT NULL,
  presupuesto_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  gasto_actual NUMERIC(14,2) NOT NULL DEFAULT 0,
  fecha_inicio DATE,
  fecha_fin DATE,
  ultima_version INT NOT NULL DEFAULT 0,          -- ignora eventos viejos
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE reporte_clientes (
  cliente_id UUID PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  nit VARCHAR(30),
  estado VARCHAR(20),
  linea_credito_limite NUMERIC(14,2),
  linea_credito_usado NUMERIC(14,2),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE reporte_facturacion (
  factura_id UUID PRIMARY KEY,
  cliente_id UUID NOT NULL,
  campana_id UUID,
  estado VARCHAR(20) NOT NULL,
  total NUMERIC(14,2) NOT NULL,
  moneda CHAR(3) NOT NULL DEFAULT 'BOB',
  fecha_emision DATE,
  fecha_vencimiento DATE,                          -- dias_vencida se calcula en la vista
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX indice_rep_fact_cliente ON reporte_facturacion (cliente_id);
CREATE INDEX indice_rep_fact_venc ON reporte_facturacion (fecha_vencimiento) WHERE estado <> 'PAGADA';

-- evita procesar dos veces el mismo evento (RabbitMQ entrega al menos una vez)
CREATE TABLE eventos_procesados (
  id_evento UUID PRIMARY KEY,
  tipo_evento VARCHAR(80) NOT NULL,
  procesado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------- agentes y modelos
CREATE TABLE agentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(80) NOT NULL UNIQUE,              -- monitor_campanas, creativo, cobranza, marca
  mision TEXT NOT NULL,
  habilidades JSONB NOT NULL DEFAULT '[]',
  disparador VARCHAR(100),                         -- cron o evento
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE ejecuciones_agente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id UUID NOT NULL REFERENCES agentes(id),
  disparador VARCHAR(100),
  estado VARCHAR(15) NOT NULL DEFAULT 'en_curso'
    CHECK (estado IN ('en_curso','exitosa','fallida')),
  entrada JSONB,
  salida JSONB,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);
CREATE INDEX indice_ejec_agente ON ejecuciones_agente (agente_id, started_at DESC);

CREATE TABLE modelos_aprendizaje (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(80) NOT NULL,                     -- roi_xgboost, kmeans_audiencias, yolo_marca...
  tipo VARCHAR(20) NOT NULL
    CHECK (tipo IN ('supervisado','no_supervisado','deep_learning')),
  version VARCHAR(20) NOT NULL,
  metricas JSONB,
  artefacto_ruta TEXT,                             -- ruta en Storage
  activo BOOLEAN NOT NULL DEFAULT false,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (nombre, version)
);

-- ------------------------------------------------ auditoria MCP (nueva)
CREATE TABLE auditoria_mcp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id UUID REFERENCES agentes(id),           -- NULL si es consulta directa
  usuario_id UUID,                                 -- logico (Keycloak sub)
  herramienta VARCHAR(100) NOT NULL,
  parametros JSONB NOT NULL,
  resultado_resumen JSONB,                         -- solo conteos/metadatos, no filas
  exito BOOLEAN NOT NULL,
  bloqueado BOOLEAN NOT NULL DEFAULT false,        -- rechazada por validacion
  motivo_bloqueo VARCHAR(200),
  error TEXT,
  duracion_ms INT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX indice_mcp_aud_fecha ON auditoria_mcp (creado_en DESC);
CREATE INDEX indice_mcp_aud_tool  ON auditoria_mcp (herramienta, creado_en DESC);
CREATE INDEX indice_mcp_aud_bloq  ON auditoria_mcp (creado_en DESC) WHERE bloqueado;

-- ------------------------------------------ resultados de vision (nueva)
CREATE TABLE vision_resultados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pieza_id UUID NOT NULL,                          -- logico: ms-creatividades (UUID)
  campana_id UUID,
  modelo_id UUID NOT NULL REFERENCES modelos_aprendizaje(id),
  huella_imagen CHAR(64) NOT NULL,                   -- sha256 de la imagen analizada
  origen VARCHAR(15) NOT NULL DEFAULT 'servidor'
    CHECK (origen IN ('web_local','movil_local','servidor')),
  detecta_logo BOOLEAN,
  detecta_texto BOOLEAN,
  manual_marca_ok BOOLEAN,
  confianza NUMERIC(4,3) CHECK (confianza BETWEEN 0 AND 1),
  objetos_detectados JSONB,
  salida_cruda JSONB,
  duracion_ms INT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pieza_id, huella_imagen, modelo_id)        -- idempotencia ante eventos repetidos
);
CREATE INDEX indice_vision_pieza ON vision_resultados (pieza_id, creado_en DESC);
CREATE INDEX indice_vision_campana ON vision_resultados (campana_id);

-- ------------------------------------------------- idempotencia y outbox
CREATE TABLE claves_idempotencia (
  clave VARCHAR(120) PRIMARY KEY,
  huella_solicitud CHAR(64) NOT NULL,
  estado VARCHAR(12) NOT NULL DEFAULT 'EN_CURSO'
    CHECK (estado IN ('EN_CURSO','COMPLETADO')),
  codigo_estado INT,
  respuesta JSONB,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  vence_en TIMESTAMPTZ NOT NULL DEFAULT now() + interval '14 days'
);
CREATE INDEX indice_idem_expira ON claves_idempotencia (vence_en);

CREATE TABLE bandeja_salida_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secuencia BIGSERIAL,
  tipo_agregado VARCHAR(40) NOT NULL,
  agregado_id UUID NOT NULL,
  tipo_evento VARCHAR(80) NOT NULL,
  carga JSONB NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  publicado_en TIMESTAMPTZ
);
CREATE INDEX indice_bandeja_pendientes ON bandeja_salida_eventos (secuencia) WHERE publicado_en IS NULL;

-- ------------------------------------------------------------ vistas MCP
-- El servidor MCP SOLO consulta estas vistas, con el rol lector_mcp.
CREATE VIEW vista_mcp_campanas AS
  SELECT campana_id, cliente_id, nombre, estado, presupuesto_total, gasto_actual,
         fecha_inicio, fecha_fin
  FROM reporte_campanas;
CREATE VIEW vista_mcp_facturacion AS
  SELECT factura_id, cliente_id, estado, total, moneda, fecha_emision, fecha_vencimiento,
         GREATEST(0, CURRENT_DATE - fecha_vencimiento) AS dias_vencida
  FROM reporte_facturacion;
CREATE VIEW vista_mcp_clientes AS
  SELECT cliente_id, nombre, estado, linea_credito_limite, linea_credito_usado
  FROM reporte_clientes;

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'lector_mcp') THEN
    CREATE ROLE lector_mcp NOLOGIN;
  END IF;
END $$;
GRANT SELECT ON vista_mcp_campanas, vista_mcp_facturacion, vista_mcp_clientes TO lector_mcp;
-- lector_mcp NO recibe permisos sobre tablas base ni sobre auditoria_mcp.
-- Para usarlo: crear un usuario LOGIN con "GRANT lector_mcp TO <usuario>" y
-- un statement_timeout corto (ALTER ROLE <usuario> SET statement_timeout = '5s').

-- Una vista corre con los permisos de su dueno (postgres, que bypassa RLS), no con los
-- de quien consulta: el RLS de las tablas base NO protege estas vistas. Supabase otorga
-- privilegios por defecto a anon/authenticated (los roles de su API publica) sobre los
-- objetos nuevos de "public"; sin este REVOKE, las vistas MCP quedarian legibles con la
-- anon key publica, saltandose la regla de que el MCP es la unica via a los datos.
REVOKE ALL ON vista_mcp_campanas, vista_mcp_facturacion, vista_mcp_clientes
  FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------ triggers y seguridad
CREATE TRIGGER disparador_rep_camp_upd BEFORE UPDATE ON reporte_campanas
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();
CREATE TRIGGER disparador_rep_cli_upd BEFORE UPDATE ON reporte_clientes
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();
CREATE TRIGGER disparador_rep_fact_upd BEFORE UPDATE ON reporte_facturacion
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['reporte_campanas','reporte_clientes','reporte_facturacion',
    'eventos_procesados','agentes','ejecuciones_agente','modelos_aprendizaje','auditoria_mcp',
    'vision_resultados','claves_idempotencia','bandeja_salida_eventos'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- La auditoria es solo de agregar (el rol de la app no puede editarla ni borrarla)
REVOKE UPDATE, DELETE, TRUNCATE ON auditoria_mcp FROM PUBLIC;

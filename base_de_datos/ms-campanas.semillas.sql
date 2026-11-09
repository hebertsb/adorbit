-- ============================================================================
-- Semillas Completas AdOrbit | Supabase #1 (ms-campanas)
-- Total: 15 Campañas, 15 Presupuestos, 52 Medios, 3 SAGAs, 12 Pasos, Outbox
-- IDs cortos de 4-5 caracteres legibles: Campañas (..c001), Medios (..d001), Clientes (..0001)
-- ============================================================================

DELETE FROM saga_pasos;
DELETE FROM saga_transacciones;
DELETE FROM calendario_medios;
DELETE FROM presupuestos;
DELETE FROM campanas;
DELETE FROM bandeja_salida_eventos;
DELETE FROM claves_idempotencia;

-- 1. INSERCION DE 15 CAMPANAS REALES (IDs: c001 a c015)
INSERT INTO campanas (id, cliente_id, nombre, descripcion, estado, fecha_inicio, fecha_fin, version)
VALUES
  ('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-000000000001', 'Lanzamiento Cuenta Joven 2026: Tu Plata, Tu Ritmo', 'Campaña omnicanal de captación de cuentas de ahorro digitales y tarjetas de débito personalizadas para universitarios de 18 a 25 años en el eje troncal.', 'activa', '2026-02-01', '2026-05-31', 1),
  ('00000000-0000-0000-0000-00000000c002', '00000000-0000-0000-0000-000000000001', 'Crédito de Vivienda Social 2026: Tu Casa Propia', 'Promoción de préstamos hipotecarios con tasa regulada del 5.5% para primera vivienda, dirigida a familias jóvenes.', 'finalizada', '2025-10-01', '2026-01-31', 1),
  ('00000000-0000-0000-0000-00000000c003', '00000000-0000-0000-0000-000000000002', 'Paceña Carnaval 2026: El Orgullo de Compartir', 'Pauta masiva nacional para los corsos de Santa Cruz, Oruro y Cochabamba, incluyendo transmisión en vivo por televisión y activaciones BTL.', 'pendiente_aprobacion', '2026-02-10', '2026-03-25', 1),
  ('00000000-0000-0000-0000-00000000c004', '00000000-0000-0000-0000-000000000002', 'Huari Orígenes: Maridaje con Identidad', 'Posicionamiento gastronómico de Huari Tradicional y Miel en restaurantes gourmet y festivales culinarios de La Paz y Santa Cruz.', 'activa', '2026-03-01', '2026-06-30', 1),
  ('00000000-0000-0000-0000-00000000c005', '00000000-0000-0000-0000-000000000003', 'Vuelta a Clases con Sofía: Nutrición Práctica', 'Promoción en cadenas de supermercados y friales de embutidos, mortadelas y nuggets listos para armar meriendas escolares nutritivas.', 'finalizada', '2026-01-20', '2026-03-10', 1),
  ('00000000-0000-0000-0000-00000000c006', '00000000-0000-0000-0000-000000000003', 'Festival del Asado Sofía: San Juan 2026', 'Campaña estacional de cortes parrilleros, chorizos criollos y carbón vegetal para la noche de San Juan a nivel nacional.', 'borrador', '2026-06-01', '2026-06-25', 1),
  ('00000000-0000-0000-0000-00000000c007', '00000000-0000-0000-0000-000000000004', 'Chávez Cuida Tu Invierno: Campaña Antigripal 2026', 'Estrategia preventiva nacional con descuentos especiales en antigripales, propóleos y jarabes naturales en más de 120 sucursales.', 'activa', '2026-04-15', '2026-07-15', 1),
  ('00000000-0000-0000-0000-00000000c008', '00000000-0000-0000-0000-000000000004', 'Mamá Saludable: Belleza y Dermocosmética Chávez', 'Promociones para el Día de la Madre en líneas de cuidado facial, cremas dermatológicas y perfumes importados.', 'pendiente_aprobacion', '2026-05-01', '2026-05-31', 1),
  ('00000000-0000-0000-0000-00000000c009', '00000000-0000-0000-0000-000000000005', 'Tigo Hogar Fibra 1000 Mbps: Navega a la Velocidad de la Luz', 'Lanzamiento de planes ultrarrápidos simétricos de fibra óptica residencial con instalación gratuita y 2 meses de Disney+ incluido.', 'activa', '2026-01-15', '2026-06-30', 1),
  ('00000000-0000-0000-0000-00000000c010', '00000000-0000-0000-0000-000000000005', 'Tigo Money: Cobros QR Simples para Comercios de Barrio', 'Incentivo para tenderos y comerciantes minoristas para habilitar cobros QR sin comisión y participar de sorteos mensuales.', 'pausada', '2026-02-01', '2026-04-30', 1),
  ('00000000-0000-0000-0000-00000000c011', '00000000-0000-0000-0000-000000000006', 'Magia de Verano Coca-Cola Sin Azúcar 2026', 'Campaña de refrescancia en balnearios, parques y eventos urbanos de Santa Cruz y Cochabamba destacando el sabor auténtico sin calorías.', 'finalizada', '2025-12-01', '2026-02-28', 1),
  ('00000000-0000-0000-0000-00000000c012', '00000000-0000-0000-0000-000000000007', 'Miércoles de Frescura Hipermaxi: Calidad de la Granja a tu Mesa', 'Publicidad periódica semanal comunicando ofertas especiales de hasta 30% en frutas seleccionadas, hortalizas y carnes de primera.', 'activa', '2026-01-01', '2026-12-31', 1),
  ('00000000-0000-0000-0000-00000000c013', '00000000-0000-0000-0000-000000000008', 'Conoce Tu País con BoA: Vuelos Directos Salar de Uyuni', 'Promoción turística invernal con tarifas promocionales hacia Uyuni, Rurrenabaque y Tarija para incentivar el turismo interno.', 'activa', '2026-03-01', '2026-06-30', 1),
  ('00000000-0000-0000-0000-00000000c014', '00000000-0000-0000-0000-000000000009', 'Mentisan 85 Años: El Alivio de Generaciones', 'Campaña conmemorativa de aniversario celebrando el ungüento ícono de las familias bolivianas con spots testimoniales y piezas emotivas.', 'pendiente_aprobacion', '2026-05-10', '2026-08-31', 1),
  ('00000000-0000-0000-0000-00000000c015', '00000000-0000-0000-0000-000000000010', 'Suzuki New Swift Hybrid 2026: Rendimiento Inteligente', 'Lanzamiento del compacto híbrido autorecargable con pruebas de manejo en showroom y planes de financiamiento con 0% de cuota inicial.', 'cancelada', '2026-01-10', '2026-03-31', 1);

-- 2. INSERCION DE 15 PRESUPUESTOS (IDs: b001 a b015)
INSERT INTO presupuestos (id, campana_id, monto_total, monto_gastado, moneda, estado, version)
VALUES
  ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-00000000c001', 185000.00, 92400.00, 'BOB', 'consumido', 1),
  ('00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-00000000c002', 220000.00, 220000.00, 'BOB', 'consumido', 1),
  ('00000000-0000-0000-0000-00000000b003', '00000000-0000-0000-0000-00000000c003', 340000.00, 0.00, 'BOB', 'reservado', 1),
  ('00000000-0000-0000-0000-00000000b004', '00000000-0000-0000-0000-00000000c004', 130000.00, 45000.00, 'BOB', 'consumido', 1),
  ('00000000-0000-0000-0000-00000000b005', '00000000-0000-0000-0000-00000000c005', 95000.00, 95000.00, 'BOB', 'consumido', 1),
  ('00000000-0000-0000-0000-00000000b006', '00000000-0000-0000-0000-00000000c006', 110000.00, 0.00, 'BOB', 'borrador', 1),
  ('00000000-0000-0000-0000-00000000b007', '00000000-0000-0000-0000-00000000c007', 80000.00, 25000.00, 'BOB', 'consumido', 1),
  ('00000000-0000-0000-0000-00000000b008', '00000000-0000-0000-0000-00000000c008', 55000.00, 0.00, 'BOB', 'reservado', 1),
  ('00000000-0000-0000-0000-00000000b009', '00000000-0000-0000-0000-00000000c009', 280000.00, 175000.00, 'BOB', 'consumido', 1),
  ('00000000-0000-0000-0000-00000000b010', '00000000-0000-0000-0000-00000000c010', 90000.00, 64000.00, 'BOB', 'consumido', 1),
  ('00000000-0000-0000-0000-00000000b011', '00000000-0000-0000-0000-00000000c011', 210000.00, 210000.00, 'BOB', 'consumido', 1),
  ('00000000-0000-0000-0000-00000000b012', '00000000-0000-0000-0000-00000000c012', 160000.00, 53300.00, 'BOB', 'consumido', 1),
  ('00000000-0000-0000-0000-00000000b013', '00000000-0000-0000-0000-00000000c013', 145000.00, 60000.00, 'BOB', 'consumido', 1),
  ('00000000-0000-0000-0000-00000000b014', '00000000-0000-0000-0000-00000000c014', 175000.00, 0.00, 'BOB', 'reservado', 1),
  ('00000000-0000-0000-0000-00000000b015', '00000000-0000-0000-0000-00000000c015', 120000.00, 15000.00, 'BOB', 'liberado', 1);

-- 3. INSERCION DE 52 MEDIOS CALENDARIO (IDs: d001 a d052)
INSERT INTO calendario_medios (id, campana_id, medio, fecha_inicio, fecha_fin, costo, estado, version)
VALUES
  ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-00000000c001', 'redes', '2026-02-01', '2026-05-31', 65000.00, 'ejecutado', 1),
  ('00000000-0000-0000-0000-00000000d002', '00000000-0000-0000-0000-00000000c001', 'digital', '2026-02-05', '2026-05-20', 45000.00, 'ejecutado', 1),
  ('00000000-0000-0000-0000-00000000d003', '00000000-0000-0000-0000-00000000c001', 'vallas', '2026-02-15', '2026-04-30', 40000.00, 'confirmado', 1),
  ('00000000-0000-0000-0000-00000000d004', '00000000-0000-0000-0000-00000000c001', 'radio', '2026-02-10', '2026-04-15', 35000.00, 'ejecutado', 1),
  ('00000000-0000-0000-0000-00000000d005', '00000000-0000-0000-0000-00000000c002', 'tv', '2025-10-05', '2025-12-20', 100000.00, 'ejecutado', 1),
  ('00000000-0000-0000-0000-00000000d006', '00000000-0000-0000-0000-00000000c002', 'prensa', '2025-10-10', '2025-12-15', 45000.00, 'ejecutado', 1),
  ('00000000-0000-0000-0000-00000000d007', '00000000-0000-0000-0000-00000000c002', 'digital', '2025-10-01', '2026-01-31', 50000.00, 'ejecutado', 1),
  ('00000000-0000-0000-0000-00000000d008', '00000000-0000-0000-0000-00000000c002', 'vallas', '2025-10-15', '2026-01-15', 25000.00, 'ejecutado', 1),
  ('00000000-0000-0000-0000-00000000d009', '00000000-0000-0000-0000-00000000c003', 'tv', '2026-02-10', '2026-03-05', 160000.00, 'confirmado', 1),
  ('00000000-0000-0000-0000-00000000d010', '00000000-0000-0000-0000-00000000c003', 'vallas', '2026-02-10', '2026-03-15', 80000.00, 'confirmado', 1),
  ('00000000-0000-0000-0000-00000000d011', '00000000-0000-0000-0000-00000000c003', 'redes', '2026-02-12', '2026-03-20', 65000.00, 'confirmado', 1),
  ('00000000-0000-0000-0000-00000000d012', '00000000-0000-0000-0000-00000000c003', 'radio', '2026-02-15', '2026-03-05', 35000.00, 'confirmado', 1),
  ('00000000-0000-0000-0000-00000000d013', '00000000-0000-0000-0000-00000000c004', 'digital', '2026-03-01', '2026-06-30', 50000.00, 'ejecutado', 1),
  ('00000000-0000-0000-0000-00000000d014', '00000000-0000-0000-0000-00000000c004', 'redes', '2026-03-05', '2026-06-15', 45000.00, 'ejecutado', 1),
  ('00000000-0000-0000-0000-00000000d015', '00000000-0000-0000-0000-00000000c004', 'prensa', '2026-03-15', '2026-05-30', 35000.00, 'confirmado', 1),
  ('00000000-0000-0000-0000-00000000d016', '00000000-0000-0000-0000-00000000c005', 'digital', '2026-01-20', '2026-03-10', 35000.00, 'ejecutado', 1),
  ('00000000-0000-0000-0000-00000000d017', '00000000-0000-0000-0000-00000000c005', 'prensa', '2026-01-25', '2026-02-28', 32000.00, 'ejecutado', 1),
  ('00000000-0000-0000-0000-00000000d018', '00000000-0000-0000-0000-00000000c005', 'radio', '2026-01-22', '2026-02-20', 28000.00, 'ejecutado', 1),
  ('00000000-0000-0000-0000-00000000d019', '00000000-0000-0000-0000-00000000c006', 'redes', '2026-06-01', '2026-06-24', 45000.00, 'planificado', 1),
  ('00000000-0000-0000-0000-00000000d020', '00000000-0000-0000-0000-00000000c006', 'vallas', '2026-06-05', '2026-06-25', 35000.00, 'planificado', 1),
  ('00000000-0000-0000-0000-00000000d021', '00000000-0000-0000-0000-00000000c006', 'tv', '2026-06-10', '2026-06-24', 30000.00, 'planificado', 1),
  ('00000000-0000-0000-0000-00000000d022', '00000000-0000-0000-0000-00000000c007', 'redes', '2026-04-15', '2026-07-15', 35000.00, 'ejecutado', 1),
  ('00000000-0000-0000-0000-00000000d023', '00000000-0000-0000-0000-00000000c007', 'tv', '2026-05-01', '2026-06-30', 25000.00, 'confirmado', 1),
  ('00000000-0000-0000-0000-00000000d024', '00000000-0000-0000-0000-00000000c007', 'radio', '2026-04-20', '2026-07-05', 20000.00, 'confirmado', 1),
  ('00000000-0000-0000-0000-00000000d025', '00000000-0000-0000-0000-00000000c008', 'redes', '2026-05-01', '2026-05-28', 30000.00, 'planificado', 1),
  ('00000000-0000-0000-0000-00000000d026', '00000000-0000-0000-0000-00000000c008', 'digital', '2026-05-05', '2026-05-27', 15000.00, 'planificado', 1),
  ('00000000-0000-0000-0000-00000000d027', '00000000-0000-0000-0000-00000000c008', 'prensa', '2026-05-15', '2026-05-27', 10000.00, 'planificado', 1),
  ('00000000-0000-0000-0000-00000000d028', '00000000-0000-0000-0000-00000000c009', 'tv', '2026-01-20', '2026-04-30', 120000.00, 'ejecutado', 1),
  ('00000000-0000-0000-0000-00000000d029', '00000000-0000-0000-0000-00000000c009', 'redes', '2026-01-15', '2026-06-30', 80000.00, 'ejecutado', 1),
  ('00000000-0000-0000-0000-00000000d030', '00000000-0000-0000-0000-00000000c009', 'vallas', '2026-02-01', '2026-05-31', 50000.00, 'confirmado', 1),
  ('00000000-0000-0000-0000-00000000d031', '00000000-0000-0000-0000-00000000c009', 'radio', '2026-02-01', '2026-04-30', 30000.00, 'ejecutado', 1),
  ('00000000-0000-0000-0000-00000000d032', '00000000-0000-0000-0000-00000000c010', 'redes', '2026-02-01', '2026-04-15', 45000.00, 'ejecutado', 1),
  ('00000000-0000-0000-0000-00000000d033', '00000000-0000-0000-0000-00000000c010', 'radio', '2026-02-05', '2026-03-31', 25000.00, 'ejecutado', 1),
  ('00000000-0000-0000-0000-00000000d034', '00000000-0000-0000-0000-00000000c010', 'vallas', '2026-02-10', '2026-04-20', 20000.00, 'confirmado', 1),
  ('00000000-0000-0000-0000-00000000d035', '00000000-0000-0000-0000-00000000c011', 'tv', '2025-12-05', '2026-02-15', 90000.00, 'ejecutado', 1),
  ('00000000-0000-0000-0000-00000000d036', '00000000-0000-0000-0000-00000000c011', 'vallas', '2025-12-01', '2026-02-28', 60000.00, 'ejecutado', 1),
  ('00000000-0000-0000-0000-00000000d037', '00000000-0000-0000-0000-00000000c011', 'redes', '2025-12-10', '2026-02-20', 40000.00, 'ejecutado', 1),
  ('00000000-0000-0000-0000-00000000d038', '00000000-0000-0000-0000-00000000c011', 'digital', '2025-12-15', '2026-02-10', 20000.00, 'ejecutado', 1),
  ('00000000-0000-0000-0000-00000000d039', '00000000-0000-0000-0000-00000000c012', 'prensa', '2026-01-05', '2026-12-20', 60000.00, 'ejecutado', 1),
  ('00000000-0000-0000-0000-00000000d040', '00000000-0000-0000-0000-00000000c012', 'redes', '2026-01-01', '2026-12-31', 50000.00, 'ejecutado', 1),
  ('00000000-0000-0000-0000-00000000d041', '00000000-0000-0000-0000-00000000c012', 'tv', '2026-02-01', '2026-11-30', 30000.00, 'confirmado', 1),
  ('00000000-0000-0000-0000-00000000d042', '00000000-0000-0000-0000-00000000c012', 'radio', '2026-01-15', '2026-10-31', 20000.00, 'ejecutado', 1),
  ('00000000-0000-0000-0000-00000000d043', '00000000-0000-0000-0000-00000000c013', 'digital', '2026-03-01', '2026-06-30', 60000.00, 'ejecutado', 1),
  ('00000000-0000-0000-0000-00000000d044', '00000000-0000-0000-0000-00000000c013', 'vallas', '2026-03-15', '2026-06-15', 45000.00, 'confirmado', 1),
  ('00000000-0000-0000-0000-00000000d045', '00000000-0000-0000-0000-00000000c013', 'redes', '2026-03-05', '2026-06-25', 40000.00, 'ejecutado', 1),
  ('00000000-0000-0000-0000-00000000d046', '00000000-0000-0000-0000-00000000c014', 'tv', '2026-05-15', '2026-07-31', 80000.00, 'planificado', 1),
  ('00000000-0000-0000-0000-00000000d047', '00000000-0000-0000-0000-00000000c014', 'redes', '2026-05-10', '2026-08-25', 45000.00, 'planificado', 1),
  ('00000000-0000-0000-0000-00000000d048', '00000000-0000-0000-0000-00000000c014', 'vallas', '2026-05-20', '2026-08-20', 30000.00, 'planificado', 1),
  ('00000000-0000-0000-0000-00000000d049', '00000000-0000-0000-0000-00000000c014', 'radio', '2026-05-15', '2026-08-15', 20000.00, 'planificado', 1),
  ('00000000-0000-0000-0000-00000000d050', '00000000-0000-0000-0000-00000000c015', 'digital', '2026-01-10', '2026-02-15', 50000.00, 'cancelado', 1),
  ('00000000-0000-0000-0000-00000000d051', '00000000-0000-0000-0000-00000000c015', 'vallas', '2026-01-15', '2026-02-28', 40000.00, 'cancelado', 1),
  ('00000000-0000-0000-0000-00000000d052', '00000000-0000-0000-0000-00000000c015', 'redes', '2026-01-10', '2026-02-20', 30000.00, 'cancelado', 1);

-- 4. INSERCION DE SAGAS DE CONTRATACION (IDs: 5a01 a 5a03)
INSERT INTO saga_transacciones (id, campana_id, clave_idempotencia, estado, paso_actual, motivo_fallo, version)
VALUES
  ('00000000-0000-0000-0000-000000005a01', '00000000-0000-0000-0000-00000000c001', 'idemp-contratar-c001', 'completada', 5, NULL, 1),
  ('00000000-0000-0000-0000-000000005a02', '00000000-0000-0000-0000-00000000c003', 'idemp-contratar-c003', 'reservando_credito', 2, NULL, 1),
  ('00000000-0000-0000-0000-000000005a03', '00000000-0000-0000-0000-00000000c015', 'idemp-contratar-c015', 'compensada', 3, 'Cliente cancelo operacion antes de facturar', 1);

-- 5. PASOS DE CADA SAGA (IDs: 5101 a 5112)
INSERT INTO saga_pasos (id, saga_id, orden, tipo, servicio, accion, clave_comando, estado, intentos)
VALUES
  ('00000000-0000-0000-0000-000000005101', '00000000-0000-0000-0000-000000005a01', 1, 'accion', 'ms-campanas', 'reservar_presupuesto', '5a01:1:accion', 'exitoso', 1),
  ('00000000-0000-0000-0000-000000005102', '00000000-0000-0000-0000-000000005a01', 2, 'accion', 'ms-clientes-crm', 'reservar_credito', '5a01:2:accion', 'exitoso', 1),
  ('00000000-0000-0000-0000-000000005103', '00000000-0000-0000-0000-000000005a01', 3, 'accion', 'ms-creatividades', 'bloquear_piezas', '5a01:3:accion', 'exitoso', 1),
  ('00000000-0000-0000-0000-000000005104', '00000000-0000-0000-0000-000000005a01', 4, 'accion', 'ms-facturacion', 'emitir_factura', '5a01:4:accion', 'exitoso', 1),
  ('00000000-0000-0000-0000-000000005105', '00000000-0000-0000-0000-000000005a01', 5, 'accion', 'ms-campanas', 'activar_campana', '5a01:5:accion', 'exitoso', 1),
  ('00000000-0000-0000-0000-000000005106', '00000000-0000-0000-0000-000000005a02', 1, 'accion', 'ms-campanas', 'reservar_presupuesto', '5a02:1:accion', 'exitoso', 1),
  ('00000000-0000-0000-0000-000000005107', '00000000-0000-0000-0000-000000005a02', 2, 'accion', 'ms-clientes-crm', 'reservar_credito', '5a02:2:accion', 'pendiente', 0),
  ('00000000-0000-0000-0000-000000005108', '00000000-0000-0000-0000-000000005a03', 1, 'accion', 'ms-campanas', 'reservar_presupuesto', '5a03:1:accion', 'exitoso', 1),
  ('00000000-0000-0000-0000-000000005109', '00000000-0000-0000-0000-000000005a03', 2, 'accion', 'ms-clientes-crm', 'reservar_credito', '5a03:2:accion', 'exitoso', 1),
  ('00000000-0000-0000-0000-000000005110', '00000000-0000-0000-0000-000000005a03', 3, 'accion', 'ms-creatividades', 'bloquear_piezas', '5a03:3:accion', 'fallido', 1),
  ('00000000-0000-0000-0000-000000005111', '00000000-0000-0000-0000-000000005a03', 2, 'compensacion', 'ms-clientes-crm', 'liberar_credito', '5a03:2:comp', 'exitoso', 1),
  ('00000000-0000-0000-0000-000000005112', '00000000-0000-0000-0000-000000005a03', 1, 'compensacion', 'ms-campanas', 'liberar_presupuesto', '5a03:1:comp', 'exitoso', 1);

-- 6. BANDEJA DE SALIDA (Outbox Transaccional)
INSERT INTO bandeja_salida_eventos (id, tipo_agregado, agregado_id, tipo_evento, carga, publicado_en)
VALUES
  ('00000000-0000-0000-0000-00000000e001', 'Campana', '00000000-0000-0000-0000-00000000c001', 'CampanaCreada', '{"nombre": "Cuenta Joven BMSC"}', now()),
  ('00000000-0000-0000-0000-00000000e002', 'Campana', '00000000-0000-0000-0000-00000000c001', 'CampanaContratada', '{"presupuesto": 185000}', now()),
  ('00000000-0000-0000-0000-00000000e003', 'Campana', '00000000-0000-0000-0000-00000000c003', 'CampanaCreada', '{"nombre": "Paceña Carnaval 2026"}', now()),
  ('00000000-0000-0000-0000-00000000e004', 'Campana', '00000000-0000-0000-0000-00000000c009', 'CampanaCreada', '{"nombre": "Tigo Hogar Fibra 1000"}', now()),
  ('00000000-0000-0000-0000-00000000e005', 'Campana', '00000000-0000-0000-0000-00000000c012', 'CampanaCreada', '{"nombre": "Hipermaxi Miércoles Frescura"}', now());

-- 7. CLAVES DE IDEMPOTENCIA HISTORICAS
INSERT INTO claves_idempotencia (clave, huella_solicitud, estado, codigo_estado, respuesta)
VALUES
  ('idem-crear-c001', 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2', 'COMPLETADO', 201, '{"id": "00000000-0000-0000-0000-00000000c001", "estado": "activa"}'),
  ('idem-crear-c003', 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3', 'COMPLETADO', 201, '{"id": "00000000-0000-0000-0000-00000000c003", "estado": "pendiente_aprobacion"}'),
  ('idem-crear-c009', 'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4', 'COMPLETADO', 201, '{"id": "00000000-0000-0000-0000-00000000c009", "estado": "activa"}');

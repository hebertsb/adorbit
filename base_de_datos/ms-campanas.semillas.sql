-- ============================================================================
-- Semillas de prueba para Supabase #1 (ms-campanas)
-- Ejecutar en el SQL Editor de Supabase (https://wzsdqnltypjasnbiwtxi.supabase.co)
-- ============================================================================

-- 1. Limpieza opcional de tablas (descomentar si se desea reiniciar datos)
-- TRUNCATE TABLE bandeja_salida_eventos, claves_idempotencia, saga_pasos, saga_transacciones, calendario_medios, presupuestos, campanas CASCADE;

-- 2. Inserción de Campañas
INSERT INTO campanas (id, cliente_id, nombre, descripcion, estado, fecha_inicio, fecha_fin, version)
VALUES
  ('c0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Lanzamiento Fibra Óptica 500M', 'Campaña nacional de despliegue de fibra óptica residencial y corporativa.', 'activa', '2026-03-01', '2026-04-30', 1),
  ('c0000002-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Campaña Institucional Créditos', 'Promoción de líneas de financiamiento comercial y microcréditos para PYMEs.', 'pendiente', '2026-04-01', '2026-05-15', 1),
  ('c0000003-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'Promo Carnaval & Verano 2026', 'Activaciones en vía pública y medios masivos para temporada alta.', 'pausada', '2026-02-20', '2026-03-25', 1),
  ('c0000004-0000-0000-0000-000000000004', '44444444-4444-4444-4444-444444444444', 'Expansión B2B Santa Cruz', 'Captación de distribuidores mayoristas en el eje oriental.', 'borrador', '2026-05-15', '2026-06-10', 1)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  estado = EXCLUDED.estado;

-- 3. Inserción de Presupuestos
INSERT INTO presupuestos (id, campana_id, monto_total, monto_gastado, moneda, estado, version)
VALUES
  ('p0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 64000.00, 41600.00, 'BOB', 'consumido', 1),
  ('p0000002-0000-0000-0000-000000000002', 'c0000002-0000-0000-0000-000000000002', 52500.00, 0.00, 'BOB', 'reservado', 1),
  ('p0000003-0000-0000-0000-000000000003', 'c0000003-0000-0000-0000-000000000003', 50000.00, 45000.00, 'BOB', 'consumido', 1),
  ('p0000004-0000-0000-0000-000000000004', 'c0000004-0000-0000-0000-000000000004', 18000.00, 0.00, 'BOB', 'borrador', 1)
ON CONFLICT (id) DO UPDATE SET
  monto_total = EXCLUDED.monto_total,
  monto_gastado = EXCLUDED.monto_gastado,
  estado = EXCLUDED.estado;

-- 4. Inserción de Calendario de Medios
INSERT INTO calendario_medios (id, campana_id, medio, fecha_inicio, fecha_fin, costo, estado, version)
VALUES
  ('m0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'digital', '2026-03-01', '2026-04-30', 24000.00, 'ejecutado', 1),
  ('m0000002-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'redes', '2026-03-05', '2026-04-25', 18000.00, 'ejecutado', 1),
  ('m0000003-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000001', 'tv', '2026-03-15', '2026-04-15', 16000.00, 'confirmado', 1),
  ('m0000004-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000001', 'vallas', '2026-04-01', '2026-04-30', 6000.00, 'planificado', 1),
  ('m0000005-0000-0000-0000-000000000002', 'c0000002-0000-0000-0000-000000000002', 'digital', '2026-04-01', '2026-05-15', 20000.00, 'confirmado', 1),
  ('m0000006-0000-0000-0000-000000000002', 'c0000002-0000-0000-0000-000000000002', 'radio', '2026-04-10', '2026-05-01', 15000.00, 'confirmado', 1),
  ('m0000007-0000-0000-0000-000000000002', 'c0000002-0000-0000-0000-000000000002', 'prensa', '2026-04-15', '2026-05-10', 17500.00, 'planificado', 1)
ON CONFLICT (id) DO NOTHING;

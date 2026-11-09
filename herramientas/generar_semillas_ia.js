const fs = require('fs');

const pad = (n, len = 2) => String(n).padStart(len, '0');
const cliId = (n) => '00000000-0000-0000-0000-0000000000' + pad(n);
const cId = (n) => '00000000-0000-0000-0000-00000000c' + String(n).padStart(3, '0');
const fId = (n) => '00000000-0000-0000-0000-00000000f' + String(n).padStart(3, '0');
const pzId = (n) => '00000000-0000-0000-0000-000000001' + String(n).padStart(3, '0');
const agId = (n) => '00000000-0000-0000-0000-00000000a' + String(n).padStart(3, '0');
const modId = (n) => '00000000-0000-0000-0000-00000000de' + pad(n); // "de" = deep/data model
const ejecId = (n) => '00000000-0000-0000-0000-00000000ea' + pad(n); // "ea" = ejecucion agente
const visId = (n) => '00000000-0000-0000-0000-0000000001' + pad(n);
const mcpId = (n) => '00000000-0000-0000-0000-000000000c' + pad(n); // "c" = consulta mcp
const repId = (n) => '00000000-0000-0000-0000-000000000f' + pad(n); // "f" = informe final
const evtId = (n) => '00000000-0000-0000-0000-00000000e' + String(n).padStart(3, '0');
const usrId = (n) => '00000000-0000-0000-0000-0000000099' + pad(n);

let sql = `-- ============================================================================
-- Semillas Completas AdOrbit | Supabase #2 (ms-ia)
-- Total: Read Model (15 Campañas, 10 Clientes, 10 Facturas), 3 Modelos ML/DL,
--        4 Agentes, 6 Ejecuciones, 4 Vision DL, 8 Auditorias MCP, 4 Reportes NL
-- IDs legibles y normalizados, 100% compatibles con Supabase #2 y MCP
-- ============================================================================

DELETE FROM vision_resultados;
DELETE FROM auditoria_mcp;
DELETE FROM reportes_generados;
DELETE FROM ejecuciones_agente;
DELETE FROM agentes;
DELETE FROM modelos_aprendizaje;
DELETE FROM eventos_procesados;
DELETE FROM reporte_facturacion;
DELETE FROM reporte_campanas;
DELETE FROM reporte_clientes;
DELETE FROM claves_idempotencia;
DELETE FROM bandeja_salida_eventos;

-- 1. READ MODEL: REPORTE_CLIENTES (10 Grandes Empresas de Bolivia)
INSERT INTO reporte_clientes (cliente_id, nombre, nit, estado, linea_credito_limite, linea_credito_usado, actualizado_en)
VALUES
  ('${cliId(1)}', 'Banco Mercantil Santa Cruz S.A.', '1020304028', 'activo', 500000.00, 185000.00, now()),
  ('${cliId(2)}', 'Cervecería Boliviana Nacional S.A.', '1020456021', 'activo', 1200000.00, 470000.00, now()),
  ('${cliId(3)}', 'Avícola Sofía Ltda.', '1015682024', 'activo', 400000.00, 95000.00, now()),
  ('${cliId(4)}', 'Farmacias Chávez S.A.', '1028741029', 'activo', 300000.00, 80000.00, now()),
  ('${cliId(5)}', 'Telecel S.A. (Tigo Bolivia)', '1020112025', 'activo', 900000.00, 370000.00, now()),
  ('${cliId(6)}', 'Embotelladoras Bolivianas Unidas S.A. (EMBOL)', '1020224023', 'activo', 800000.00, 210000.00, now()),
  ('${cliId(7)}', 'Hipermaxi S.A.', '1017325026', 'activo', 500000.00, 160000.00, now()),
  ('${cliId(8)}', 'Boliviana de Aviación (BoA)', '154362025', 'activo', 600000.00, 145000.00, now()),
  ('${cliId(9)}', 'Droguería INTI S.A.', '1020339027', 'activo', 350000.00, 0.00, now()),
  ('${cliId(10)}', 'Imcruz Comercial S.A. (Suzuki)', '1020548022', 'moroso', 450000.00, 0.00, now());

-- 2. READ MODEL: REPORTE_CAMPANAS (15 Campañas sincronizadas)
INSERT INTO reporte_campanas (campana_id, cliente_id, nombre, estado, presupuesto_total, gasto_actual, fecha_inicio, fecha_fin, ultima_version, actualizado_en)
VALUES
  ('${cId(1)}', '${cliId(1)}', 'Lanzamiento Cuenta Joven 2026: Tu Plata, Tu Ritmo', 'activa', 185000.00, 92400.00, '2026-02-01', '2026-05-31', 1, now()),
  ('${cId(2)}', '${cliId(1)}', 'Crédito de Vivienda Social 2026: Tu Casa Propia', 'finalizada', 220000.00, 220000.00, '2025-10-01', '2026-01-31', 1, now()),
  ('${cId(3)}', '${cliId(2)}', 'Paceña Carnaval 2026: El Orgullo de Compartir', 'pendiente_aprobacion', 340000.00, 0.00, '2026-02-10', '2026-03-25', 1, now()),
  ('${cId(4)}', '${cliId(2)}', 'Huari Orígenes: Maridaje con Identidad', 'activa', 130000.00, 45000.00, '2026-03-01', '2026-06-30', 1, now()),
  ('${cId(5)}', '${cliId(3)}', 'Vuelta a Clases con Sofía: Nutrición Práctica', 'finalizada', 95000.00, 95000.00, '2026-01-20', '2026-03-10', 1, now()),
  ('${cId(6)}', '${cliId(3)}', 'Festival del Asado Sofía: San Juan 2026', 'borrador', 110000.00, 0.00, '2026-06-01', '2026-06-25', 1, now()),
  ('${cId(7)}', '${cliId(4)}', 'Chávez Cuida Tu Invierno: Campaña Antigripal 2026', 'activa', 80000.00, 25000.00, '2026-04-15', '2026-07-15', 1, now()),
  ('${cId(8)}', '${cliId(4)}', 'Mamá Saludable: Belleza y Dermocosmética Chávez', 'pendiente_aprobacion', 55000.00, 0.00, '2026-05-01', '2026-05-31', 1, now()),
  ('${cId(9)}', '${cliId(5)}', 'Tigo Hogar Fibra 1000 Mbps: Navega a la Velocidad de la Luz', 'activa', 280000.00, 175000.00, '2026-01-15', '2026-06-30', 1, now()),
  ('${cId(10)}', '${cliId(5)}', 'Tigo Money: Cobros QR Simples para Comercios de Barrio', 'pausada', 90000.00, 64000.00, '2026-02-01', '2026-04-30', 1, now()),
  ('${cId(11)}', '${cliId(6)}', 'Magia de Verano Coca-Cola Sin Azúcar 2026', 'finalizada', 210000.00, 210000.00, '2025-12-01', '2026-02-28', 1, now()),
  ('${cId(12)}', '${cliId(7)}', 'Miércoles de Frescura Hipermaxi: Calidad de la Granja a tu Mesa', 'activa', 160000.00, 53300.00, '2026-01-01', '2026-12-31', 1, now()),
  ('${cId(13)}', '${cliId(8)}', 'Conoce Tu País con BoA: Vuelos Directos Salar de Uyuni', 'activa', 145000.00, 60000.00, '2026-03-01', '2026-06-30', 1, now()),
  ('${cId(14)}', '${cliId(9)}', 'Mentisan 85 Años: El Alivio de Generaciones', 'pendiente_aprobacion', 175000.00, 0.00, '2026-05-10', '2026-08-31', 1, now()),
  ('${cId(15)}', '${cliId(10)}', 'Suzuki New Swift Hybrid 2026: Rendimiento Inteligente', 'cancelada', 120000.00, 15000.00, '2026-01-10', '2026-03-31', 1, now());

-- 3. READ MODEL: REPORTE_FACTURACION (10 Facturas emitidas/cobradas)
INSERT INTO reporte_facturacion (factura_id, cliente_id, campana_id, estado, total, moneda, fecha_emision, fecha_vencimiento, actualizado_en)
VALUES
  ('${fId(1)}', '${cliId(1)}', '${cId(1)}', 'EMITIDA', 185000.00, 'BOB', '2026-02-01', '2026-03-03', now()),
  ('${fId(2)}', '${cliId(1)}', '${cId(2)}', 'PAGADA', 220000.00, 'BOB', '2025-10-01', '2025-11-01', now()),
  ('${fId(3)}', '${cliId(2)}', '${cId(4)}', 'EMITIDA', 130000.00, 'BOB', '2026-03-01', '2026-04-01', now()),
  ('${fId(4)}', '${cliId(3)}', '${cId(5)}', 'PAGADA', 95000.00, 'BOB', '2026-01-20', '2026-02-20', now()),
  ('${fId(5)}', '${cliId(4)}', '${cId(7)}', 'EMITIDA', 80000.00, 'BOB', '2026-04-15', '2026-05-15', now()),
  ('${fId(6)}', '${cliId(5)}', '${cId(9)}', 'PAGADA', 280000.00, 'BOB', '2026-01-15', '2026-02-15', now()),
  ('${fId(7)}', '${cliId(5)}', '${cId(10)}', 'EMITIDA', 90000.00, 'BOB', '2026-02-01', '2026-03-01', now()),
  ('${fId(8)}', '${cliId(6)}', '${cId(11)}', 'PAGADA', 210000.00, 'BOB', '2025-12-01', '2026-01-05', now()),
  ('${fId(9)}', '${cliId(7)}', '${cId(12)}', 'EMITIDA', 160000.00, 'BOB', '2026-01-01', '2026-02-01', now()),
  ('${fId(10)}', '${cliId(8)}', '${cId(13)}', 'EMITIDA', 145000.00, 'BOB', '2026-03-01', '2026-04-01', now());

-- 4. EVENTOS PROCESADOS (Deduplicación histórica de RabbitMQ)
INSERT INTO eventos_procesados (id_evento, tipo_evento, procesado_at)
VALUES
  ('${evtId(1)}', 'CampanaCreada', now() - interval '30 days'),
  ('${evtId(2)}', 'CampanaContratada', now() - interval '25 days'),
  ('${evtId(101)}', 'CreditoReservado', now() - interval '25 days'),
  ('${evtId(201)}', 'PiezaAprobada', now() - interval '20 days'),
  ('${evtId(203)}', 'PiezasBloqueadas', now() - interval '20 days'),
  ('${evtId(301)}', 'FacturaEmitida', now() - interval '20 days');

-- 5. MODELOS DE APRENDIZAJE (ML / Deep Learning versionados)
INSERT INTO modelos_aprendizaje (id, nombre, tipo, version, metricas, artefacto_ruta, activo, creado_en)
VALUES
  ('${modId(1)}', 'yolo_marca_v2', 'deep_learning', '2.1.0',
   '{"mAP50": 0.942, "precision": 0.961, "recall": 0.915, "fps_inferencia": 45}',
   'modelos-ia/vision/yolo_marca_v2.onnx', true, now() - interval '60 days'),
  ('${modId(2)}', 'prediccion_roi_v1', 'supervisado', '1.0.4',
   '{"rmse": 1420.50, "r2_score": 0.887, "mae": 980.20}',
   'modelos-ia/tabulares/roi_xgboost_v1.joblib', true, now() - interval '45 days'),
  ('${modId(3)}', 'segmentacion_audiencia_kmeans', 'no_supervisado', '1.2.0',
   '{"silhouette_score": 0.724, "inertia": 45120.30, "k_clusters": 5}',
   'modelos-ia/clustering/audiencias_kmeans.pkl', true, now() - interval '30 days');

-- 6. AGENTES INTERNOS (Orquestados por n8n)
INSERT INTO agentes (id, nombre, mision, habilidades, disparador, activo, creado_en)
VALUES
  ('${agId(1)}', 'monitor_campanas',
   'Vigila campañas activas y alerta cuando el gasto proyectado o real se acerca al límite presupuestario (publica AlertaCampana tipo presupuesto_90_porciento).',
   '["consultar_campanas", "analizar_gasto_medios"]', 'cron (n8n: cada 30 min)', true, now()),
  ('${agId(2)}', 'cobranza',
   'Revisa facturas por vencer o vencidas y clientes en mora; genera resúmenes ejecutivos para que n8n despache notificaciones y recordatorios WhatsApp.',
   '["facturas_por_vencer", "clientes_morosos", "emitir_aviso_pago"]', 'cron (n8n: diario 08:00)', true, now()),
  ('${agId(3)}', 'agente_vision',
   'Inspecciona piezas gráficas y audiovisuales recién subidas a Supabase Storage verificando logos oficiales, ratio de aspecto, paleta cromática y tipografías corporativas.',
   '["analizar_imagen_yolo", "validar_manual_marca", "detectar_texto_ocr"]', 'evento (PiezaSubida)', true, now()),
  ('${agId(4)}', 'consultor_ejecutivo_nl',
   'Responde consultas complejas de gerencia en lenguaje natural sobre finanzas, campañas y rendimiento mediante herramientas estrictamente parametrizadas sobre vistas MCP.',
   '["vista_mcp_campanas", "vista_mcp_facturacion", "vista_mcp_clientes"]', 'api (POST /reportes/consultar)', true, now());

-- 7. EJECUCIONES DE AGENTE (Historial de tareas)
INSERT INTO ejecuciones_agente (id, agente_id, disparador, estado, entrada, salida, started_at, finished_at)
VALUES
  ('${ejecId(1)}', '${agId(1)}', 'cron (n8n)', 'exitosa',
   '{"campana_id": "${cId(1)}", "umbral": 0.85}',
   '{"alerta": false, "porcentaje_consumido": 50.0, "estado_presupuesto": "saludable"}',
   now() - interval '2 hours', now() - interval '2 hours' + interval '4 seconds'),
  ('${ejecId(2)}', '${agId(1)}', 'cron (n8n)', 'exitosa',
   '{"campana_id": "${cId(2)}", "umbral": 0.90}',
   '{"alerta": true, "porcentaje_consumido": 100.0, "mensaje": "Presupuesto consumido en su totalidad"}',
   now() - interval '4 hours', now() - interval '4 hours' + interval '3 seconds'),
  ('${ejecId(3)}', '${agId(2)}', 'cron (n8n)', 'exitosa',
   '{"dias_horizonte": 15}',
   '{"total_facturas_por_vencer": 2, "monto_total_por_vencer": 345000.00, "clientes_morosos_detectados": ["${cliId(10)}"]}',
   now() - interval '1 day', now() - interval '1 day' + interval '8 seconds'),
  ('${ejecId(4)}', '${agId(3)}', 'evento (PiezaSubida)', 'exitosa',
   '{"pieza_id": "${pzId(1)}", "ruta": "piezas-creatividades/bmsc/spot-cuenta-joven-30s.mp4"}',
   '{"detecta_logo": true, "confianza": 0.985, "marca_ok": true}',
   now() - interval '5 days', now() - interval '5 days' + interval '25 seconds'),
  ('${ejecId(5)}', '${agId(3)}', 'evento (PiezaSubida)', 'exitosa',
   '{"pieza_id": "${pzId(32)}", "ruta": "piezas-creatividades/suzuki/valla-cristo-v1-rechazada.jpg"}',
   '{"detecta_logo": true, "confianza": 0.912, "marca_ok": false, "motivo": "Logo Suzuki deformado horizontalmente"}',
   now() - interval '10 days', now() - interval '10 days' + interval '12 seconds'),
  ('${ejecId(6)}', '${agId(4)}', 'api', 'exitosa',
   '{"pregunta": "¿Cuál es la campaña activa con mayor presupuesto y su porcentaje de gasto actual?"}',
   '{"campana": "Tigo Hogar Fibra 1000 Mbps", "presupuesto": 280000.00, "gasto": 175000.00, "porcentaje": 62.5}',
   now() - interval '30 minutes', now() - interval '30 minutes' + interval '5 seconds');

-- 8. RESULTADOS DE VISION DL (Deep Learning / YOLO)
INSERT INTO vision_resultados (id, pieza_id, campana_id, modelo_id, huella_imagen, origen, detecta_logo, detecta_texto, manual_marca_ok, confianza, objetos_detectados, salida_cruda, duracion_ms, creado_en)
VALUES
  ('${visId(1)}', '${pzId(1)}', '${cId(1)}', '${modId(1)}',
   'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
   'servidor', true, true, true, 0.985,
   '{"clases": ["logo_bmsc", "tarjeta_debito", "persona_joven"], "cajas_delimitadoras": [[120,45,350,220],[400,100,580,310]]}',
   '{"inference_time_ms": 22, "device": "cuda:0"}', 185, now() - interval '5 days'),
  ('${visId(2)}', '${pzId(6)}', '${cId(3)}', '${modId(1)}',
   'f4c1d55309fd2d250bfcf5d9007fc03538bf52f5750ca45db506002c8963c966',
   'servidor', true, true, true, 0.991,
   '{"clases": ["logo_pacena", "botella_cerveza", "comparsa_cambas"], "cajas_delimitadoras": [[50,30,220,180]]}',
   '{"inference_time_ms": 25, "device": "cuda:0"}', 210, now() - interval '4 days'),
  ('${visId(3)}', '${pzId(14)}', '${cId(6)}', '${modId(1)}',
   'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
   'web_local', true, true, false, 0.740,
   '{"clases": ["logo_sofia", "asador_parrilla"], "observacion": "Contraste deficiente de texto sobre humo"}',
   '{"inference_time_ms": 68, "device": "webgpu"}', 340, now() - interval '2 days'),
  ('${visId(4)}', '${pzId(32)}', '${cId(15)}', '${modId(1)}',
   'c5d6e7f8a9b0123456789abcdef0123456789abcdef0123456789abcdef01234',
   'servidor', true, true, false, 0.912,
   '{"clases": ["logo_suzuki", "auto_swift"], "violacion": "Logo Suzuki con relación de aspecto alterada (+14% horizontal)"}',
   '{"inference_time_ms": 24, "device": "cuda:0"}', 195, now() - interval '10 days');

-- 9. AUDITORIA MCP (Cumplimiento innegociable de seguridad: prohibido SQL libre)
INSERT INTO auditoria_mcp (id, agente_id, usuario_id, herramienta, parametros, resultado_resumen, exito, bloqueado, motivo_bloqueo, error, duracion_ms, creado_en)
VALUES
  ('${mcpId(1)}', '${agId(1)}', NULL, 'consultar_campanas',
   '{"estado": "activa", "ordenar_por": "gasto_actual"}',
   '{"filas_retornadas": 6, "tiempo_bd_ms": 4}', true, false, NULL, NULL, 12, now() - interval '2 hours'),
  ('${mcpId(2)}', '${agId(2)}', NULL, 'facturas_por_vencer',
   '{"dias_horizonte": 15}',
   '{"filas_retornadas": 2, "tiempo_bd_ms": 3}', true, false, NULL, NULL, 10, now() - interval '4 hours'),
  ('${mcpId(3)}', '${agId(2)}', NULL, 'clientes_morosos',
   '{}',
   '{"filas_retornadas": 1, "cliente_detectado": "${cliId(10)}"}', true, false, NULL, NULL, 8, now() - interval '4 hours'),
  ('${mcpId(4)}', '${agId(4)}', '${usrId(1)}', 'vista_mcp_campanas',
   '{"filtros": {"estado": "activa"}, "limite": 10}',
   '{"filas_retornadas": 6}', true, false, NULL, NULL, 15, now() - interval '30 minutes'),
  ('${mcpId(5)}', NULL, '${usrId(2)}', 'ejecutar_sql_libre',
   '{"sql": "SELECT * FROM campanas WHERE 1=1; DROP TABLE campanas;"}',
   NULL, false, true, 'HERRAMIENTA_PROHIBIDA: Prohibido ejecutar SQL libre generado por modelos', 'SQL_LIBRE_DENEGADO', 1, now() - interval '1 day'),
  ('${mcpId(6)}', '${agId(4)}', '${usrId(1)}', 'vista_mcp_facturacion',
   '{"estado": "PAGADA"}',
   '{"filas_retornadas": 4}', true, false, NULL, NULL, 14, now() - interval '20 minutes'),
  ('${mcpId(7)}', '${agId(4)}', '${usrId(1)}', 'vista_mcp_clientes',
   '{"limite": 10}',
   '{"filas_retornadas": 10}', true, false, NULL, NULL, 9, now() - interval '15 minutes'),
  ('${mcpId(8)}', NULL, '${usrId(3)}', 'consultar_datos_sensibles',
   '{"tabla": "usuarios_passwords"}',
   NULL, false, true, 'ACCESO_RESTRINGIDO: Rol lector_mcp solo tiene acceso a vistas vista_mcp_*', 'TABLA_INEXISTENTE_O_DENEGADA', 2, now() - interval '3 days');

-- 10. REPORTES GENERADOS EN LENGUAJE NATURAL (NL / LLM Groq Llama 3)
INSERT INTO reportes_generados (id, usuario_id, pregunta, respuesta_nl, herramientas_usadas, columnas, filas, estado, error, creado_en)
VALUES
  ('${repId(1)}', '${usrId(1)}',
   '¿Cuáles son las 3 campañas con mayor presupuesto asignado en 2026 y cuánto llevan gastado?',
   'Las 3 campañas con mayor presupuesto son: 1) "Paceña Carnaval 2026" con 340.000,00 BOB (0,00 BOB gastados aún por estar pendiente de aprobación), 2) "Tigo Hogar Fibra 1000 Mbps" con 280.000,00 BOB (175.000,00 BOB gastados, 62.5%), y 3) "Crédito de Vivienda Social BMSC" con 220.000,00 BOB (220.000,00 BOB gastados, 100% finalizada).',
   '["vista_mcp_campanas"]',
   '["nombre", "presupuesto_total", "gasto_actual", "estado"]',
   '[{"nombre": "Paceña Carnaval 2026", "presupuesto_total": 340000.0, "gasto_actual": 0.0, "estado": "pendiente_aprobacion"}, {"nombre": "Tigo Hogar Fibra 1000 Mbps", "presupuesto_total": 280000.0, "gasto_actual": 175000.0, "estado": "activa"}, {"nombre": "Crédito de Vivienda Social 2026", "presupuesto_total": 220000.0, "gasto_actual": 220000.0, "estado": "finalizada"}]',
   'listo', NULL, now() - interval '1 hour'),
  ('${repId(2)}', '${usrId(1)}',
   '¿Qué clientes presentan facturas pendientes de cobro o condición de mora actualmente?',
   'Se identificó que Imcruz Comercial S.A. se encuentra clasificado en estado "moroso" en el CRM. Adicionalmente, existen facturas emitidas pendientes de pago para Hipermaxi S.A. (160.000,00 BOB), Tigo Money (90.000,00 BOB), Farmacias Chávez (80.000,00 BOB), Huari CBN (130.000,00 BOB) y BoA (145.000,00 BOB).',
   '["vista_mcp_clientes", "vista_mcp_facturacion"]',
   '["cliente", "estado_crm", "total_pendiente_bob"]',
   '[{"cliente": "Imcruz Comercial S.A.", "estado_crm": "moroso", "total_pendiente_bob": 0.0}, {"cliente": "Hipermaxi S.A.", "estado_crm": "activo", "total_pendiente_bob": 160000.0}, {"cliente": "Telecel S.A.", "estado_crm": "activo", "total_pendiente_bob": 90000.0}]',
   'listo', NULL, now() - interval '45 minutes'),
  ('${repId(3)}', '${usrId(2)}',
   'Resumen del estado de validación de piezas gráficas para la campaña de Carnaval Paceña',
   'Para la campaña "Paceña Carnaval 2026" se validaron exitosamente 4 piezas mediante el modelo yolo_marca_v2: Spot Master 45s, Cutdown TV 30s, Valla Panorámica Cambódromo y Banner LED Oruro. Todas obtuvieron una confianza superior al 98% cumpliendo los estándares oficiales de paleta roja/dorada y posicionamiento de logo.',
   '["vision_resultados"]',
   '["pieza", "confianza_modelo", "manual_marca"]',
   '[{"pieza": "Spot Master 45s Carnaval", "confianza_modelo": 0.991, "manual_marca": true}, {"pieza": "Valla Cambodromo", "confianza_modelo": 0.985, "manual_marca": true}]',
   'listo', NULL, now() - interval '25 minutes'),
  ('${repId(4)}', '${usrId(3)}',
   'Previsión de retorno de inversión (ROI) estimado para el segundo trimestre 2026',
   'Basado en el modelo roi_xgboost_v1 entrenado con campañas históricas, se proyecta un multiplicador promedio de retorno de 3.4x para pauta en redes y 2.1x en vía pública durante los meses de abril a junio.',
   '["modelos_aprendizaje", "vista_mcp_campanas"]',
   '["canal", "roi_estimado_mult", "nivel_confianza"]',
   '[{"canal": "redes_sociales", "roi_estimado_mult": 3.4, "nivel_confianza": "alto"}, {"canal": "vallas_urbanas", "roi_estimado_mult": 2.1, "nivel_confianza": "medio"}]',
   'listo', NULL, now() - interval '10 minutes');

-- 11. CLAVES DE IDEMPOTENCIA
INSERT INTO claves_idempotencia (clave, huella_solicitud, estado, codigo_estado, respuesta, creado_en, vence_en)
VALUES
  ('idem-ia-ejecutar-agente-1', 'a111b222c333d444e555f666a111b222c333d444e555f666a111b222c333d444', 'COMPLETADO', 200, '{"ejecucion_id": "${ejecId(1)}", "estado": "exitosa"}', now(), now() + interval '14 days'),
  ('idem-ia-ejecutar-agente-2', 'b222c333d444e555f666a111b222c333d444e555f666a111b222c333d444e555', 'COMPLETADO', 200, '{"ejecucion_id": "${ejecId(3)}", "estado": "exitosa"}', now(), now() + interval '14 days');

-- 12. BANDEJA DE SALIDA (Outbox Transaccional ms-ia)
INSERT INTO bandeja_salida_eventos (id, tipo_agregado, agregado_id, tipo_evento, carga, creado_en, publicado_en)
VALUES
  ('${evtId(401)}', 'Agente', '${agId(1)}', 'AlertaCampanaGenerada',
   '{"tipo": "presupuesto_consumido", "campana_id": "${cId(2)}", "porcentaje": 100.0}', now() - interval '4 hours', now() - interval '4 hours' + interval '2 seconds'),
  ('${evtId(402)}', 'Vision', '${pzId(1)}', 'PiezaAnalizada',
   '{"pieza_id": "${pzId(1)}", "marca_ok": true, "confianza": 0.985}', now() - interval '5 days', now() - interval '5 days' + interval '1 second');
`;

fs.writeFileSync('base_de_datos/ms-ia.semillas.sql', sql, 'utf8');
console.log('base_de_datos/ms-ia.semillas.sql generado con exito!');

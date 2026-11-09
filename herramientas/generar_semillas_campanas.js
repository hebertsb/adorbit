const fs = require('fs');

const pad = (n, len = 3) => String(n).padStart(len, '0');
const cId = (n) => '00000000-0000-0000-0000-00000000c' + pad(n);
const bId = (n) => '00000000-0000-0000-0000-00000000b' + pad(n);
const dId = (n) => '00000000-0000-0000-0000-00000000d' + pad(n);
const cliId = (n) => '00000000-0000-0000-0000-0000000000' + String(n).padStart(2, '0');
const sId = (n) => '00000000-0000-0000-0000-000000005a' + String(n).padStart(2, '0'); // 5a = SAGA en hex (5a01..5a03)
const spId = (n) => '00000000-0000-0000-0000-0000000051' + String(n).padStart(2, '0'); // 51 = PASO SAGA en hex (5101..5112)

const campaigns = [
  {
    n: 1, cli: 1,
    nombre: 'Lanzamiento Cuenta Joven 2026: Tu Plata, Tu Ritmo',
    desc: 'Campaña omnicanal de captación de cuentas de ahorro digitales y tarjetas de débito personalizadas para universitarios de 18 a 25 años en el eje troncal.',
    estado: 'activa', ini: '2026-02-01', fin: '2026-05-31',
    total: 185000.00, gastado: 92400.00, pEst: 'consumido',
    medios: [
      { m: 'redes', ini: '2026-02-01', fin: '2026-05-31', c: 65000.00, est: 'ejecutado' },
      { m: 'digital', ini: '2026-02-05', fin: '2026-05-20', c: 45000.00, est: 'ejecutado' },
      { m: 'vallas', ini: '2026-02-15', fin: '2026-04-30', c: 40000.00, est: 'confirmado' },
      { m: 'radio', ini: '2026-02-10', fin: '2026-04-15', c: 35000.00, est: 'ejecutado' }
    ]
  },
  {
    n: 2, cli: 1,
    nombre: 'Crédito de Vivienda Social 2026: Tu Casa Propia',
    desc: 'Promoción de préstamos hipotecarios con tasa regulada del 5.5% para primera vivienda, dirigida a familias jóvenes.',
    estado: 'finalizada', ini: '2025-10-01', fin: '2026-01-31',
    total: 220000.00, gastado: 220000.00, pEst: 'consumido',
    medios: [
      { m: 'tv', ini: '2025-10-05', fin: '2025-12-20', c: 100000.00, est: 'ejecutado' },
      { m: 'prensa', ini: '2025-10-10', fin: '2025-12-15', c: 45000.00, est: 'ejecutado' },
      { m: 'digital', ini: '2025-10-01', fin: '2026-01-31', c: 50000.00, est: 'ejecutado' },
      { m: 'vallas', ini: '2025-10-15', fin: '2026-01-15', c: 25000.00, est: 'ejecutado' }
    ]
  },
  {
    n: 3, cli: 2,
    nombre: 'Paceña Carnaval 2026: El Orgullo de Compartir',
    desc: 'Pauta masiva nacional para los corsos de Santa Cruz, Oruro y Cochabamba, incluyendo transmisión en vivo por televisión y activaciones BTL.',
    estado: 'pendiente_aprobacion', ini: '2026-02-10', fin: '2026-03-25',
    total: 340000.00, gastado: 0.00, pEst: 'reservado',
    medios: [
      { m: 'tv', ini: '2026-02-10', fin: '2026-03-05', c: 160000.00, est: 'confirmado' },
      { m: 'vallas', ini: '2026-02-10', fin: '2026-03-15', c: 80000.00, est: 'confirmado' },
      { m: 'redes', ini: '2026-02-12', fin: '2026-03-20', c: 65000.00, est: 'confirmado' },
      { m: 'radio', ini: '2026-02-15', fin: '2026-03-05', c: 35000.00, est: 'confirmado' }
    ]
  },
  {
    n: 4, cli: 2,
    nombre: 'Huari Orígenes: Maridaje con Identidad',
    desc: 'Posicionamiento gastronómico de Huari Tradicional y Miel en restaurantes gourmet y festivales culinarios de La Paz y Santa Cruz.',
    estado: 'activa', ini: '2026-03-01', fin: '2026-06-30',
    total: 130000.00, gastado: 45000.00, pEst: 'consumido',
    medios: [
      { m: 'digital', ini: '2026-03-01', fin: '2026-06-30', c: 50000.00, est: 'ejecutado' },
      { m: 'redes', ini: '2026-03-05', fin: '2026-06-15', c: 45000.00, est: 'ejecutado' },
      { m: 'prensa', ini: '2026-03-15', fin: '2026-05-30', c: 35000.00, est: 'confirmado' }
    ]
  },
  {
    n: 5, cli: 3,
    nombre: 'Vuelta a Clases con Sofía: Nutrición Práctica',
    desc: 'Promoción en cadenas de supermercados y friales de embutidos, mortadelas y nuggets listos para armar meriendas escolares nutritivas.',
    estado: 'finalizada', ini: '2026-01-20', fin: '2026-03-10',
    total: 95000.00, gastado: 95000.00, pEst: 'consumido',
    medios: [
      { m: 'digital', ini: '2026-01-20', fin: '2026-03-10', c: 35000.00, est: 'ejecutado' },
      { m: 'prensa', ini: '2026-01-25', fin: '2026-02-28', c: 32000.00, est: 'ejecutado' },
      { m: 'radio', ini: '2026-01-22', fin: '2026-02-20', c: 28000.00, est: 'ejecutado' }
    ]
  },
  {
    n: 6, cli: 3,
    nombre: 'Festival del Asado Sofía: San Juan 2026',
    desc: 'Campaña estacional de cortes parrilleros, chorizos criollos y carbón vegetal para la noche de San Juan a nivel nacional.',
    estado: 'borrador', ini: '2026-06-01', fin: '2026-06-25',
    total: 110000.00, gastado: 0.00, pEst: 'borrador',
    medios: [
      { m: 'redes', ini: '2026-06-01', fin: '2026-06-24', c: 45000.00, est: 'planificado' },
      { m: 'vallas', ini: '2026-06-05', fin: '2026-06-25', c: 35000.00, est: 'planificado' },
      { m: 'tv', ini: '2026-06-10', fin: '2026-06-24', c: 30000.00, est: 'planificado' }
    ]
  },
  {
    n: 7, cli: 4,
    nombre: 'Chávez Cuida Tu Invierno: Campaña Antigripal 2026',
    desc: 'Estrategia preventiva nacional con descuentos especiales en antigripales, propóleos y jarabes naturales en más de 120 sucursales.',
    estado: 'activa', ini: '2026-04-15', fin: '2026-07-15',
    total: 80000.00, gastado: 25000.00, pEst: 'consumido',
    medios: [
      { m: 'redes', ini: '2026-04-15', fin: '2026-07-15', c: 35000.00, est: 'ejecutado' },
      { m: 'tv', ini: '2026-05-01', fin: '2026-06-30', c: 25000.00, est: 'confirmado' },
      { m: 'radio', ini: '2026-04-20', fin: '2026-07-05', c: 20000.00, est: 'confirmado' }
    ]
  },
  {
    n: 8, cli: 4,
    nombre: 'Mamá Saludable: Belleza y Dermocosmética Chávez',
    desc: 'Promociones para el Día de la Madre en líneas de cuidado facial, cremas dermatológicas y perfumes importados.',
    estado: 'pendiente_aprobacion', ini: '2026-05-01', fin: '2026-05-31',
    total: 55000.00, gastado: 0.00, pEst: 'reservado',
    medios: [
      { m: 'redes', ini: '2026-05-01', fin: '2026-05-28', c: 30000.00, est: 'planificado' },
      { m: 'digital', ini: '2026-05-05', fin: '2026-05-27', c: 15000.00, est: 'planificado' },
      { m: 'prensa', ini: '2026-05-15', fin: '2026-05-27', c: 10000.00, est: 'planificado' }
    ]
  },
  {
    n: 9, cli: 5,
    nombre: 'Tigo Hogar Fibra 1000 Mbps: Navega a la Velocidad de la Luz',
    desc: 'Lanzamiento de planes ultrarrápidos simétricos de fibra óptica residencial con instalación gratuita y 2 meses de Disney+ incluido.',
    estado: 'activa', ini: '2026-01-15', fin: '2026-06-30',
    total: 280000.00, gastado: 175000.00, pEst: 'consumido',
    medios: [
      { m: 'tv', ini: '2026-01-20', fin: '2026-04-30', c: 120000.00, est: 'ejecutado' },
      { m: 'redes', ini: '2026-01-15', fin: '2026-06-30', c: 80000.00, est: 'ejecutado' },
      { m: 'vallas', ini: '2026-02-01', fin: '2026-05-31', c: 50000.00, est: 'confirmado' },
      { m: 'radio', ini: '2026-02-01', fin: '2026-04-30', c: 30000.00, est: 'ejecutado' }
    ]
  },
  {
    n: 10, cli: 5,
    nombre: 'Tigo Money: Cobros QR Simples para Comercios de Barrio',
    desc: 'Incentivo para tenderos y comerciantes minoristas para habilitar cobros QR sin comisión y participar de sorteos mensuales.',
    estado: 'pausada', ini: '2026-02-01', fin: '2026-04-30',
    total: 90000.00, gastado: 64000.00, pEst: 'consumido',
    medios: [
      { m: 'redes', ini: '2026-02-01', fin: '2026-04-15', c: 45000.00, est: 'ejecutado' },
      { m: 'radio', ini: '2026-02-05', fin: '2026-03-31', c: 25000.00, est: 'ejecutado' },
      { m: 'vallas', ini: '2026-02-10', fin: '2026-04-20', c: 20000.00, est: 'confirmado' }
    ]
  },
  {
    n: 11, cli: 6,
    nombre: 'Magia de Verano Coca-Cola Sin Azúcar 2026',
    desc: 'Campaña de refrescancia en balnearios, parques y eventos urbanos de Santa Cruz y Cochabamba destacando el sabor auténtico sin calorías.',
    estado: 'finalizada', ini: '2025-12-01', fin: '2026-02-28',
    total: 210000.00, gastado: 210000.00, pEst: 'consumido',
    medios: [
      { m: 'tv', ini: '2025-12-05', fin: '2026-02-15', c: 90000.00, est: 'ejecutado' },
      { m: 'vallas', ini: '2025-12-01', fin: '2026-02-28', c: 60000.00, est: 'ejecutado' },
      { m: 'redes', ini: '2025-12-10', fin: '2026-02-20', c: 40000.00, est: 'ejecutado' },
      { m: 'digital', ini: '2025-12-15', fin: '2026-02-10', c: 20000.00, est: 'ejecutado' }
    ]
  },
  {
    n: 12, cli: 7,
    nombre: 'Miércoles de Frescura Hipermaxi: Calidad de la Granja a tu Mesa',
    desc: 'Publicidad periódica semanal comunicando ofertas especiales de hasta 30% en frutas seleccionadas, hortalizas y carnes de primera.',
    estado: 'activa', ini: '2026-01-01', fin: '2026-12-31',
    total: 160000.00, gastado: 53300.00, pEst: 'consumido',
    medios: [
      { m: 'prensa', ini: '2026-01-05', fin: '2026-12-20', c: 60000.00, est: 'ejecutado' },
      { m: 'redes', ini: '2026-01-01', fin: '2026-12-31', c: 50000.00, est: 'ejecutado' },
      { m: 'tv', ini: '2026-02-01', fin: '2026-11-30', c: 30000.00, est: 'confirmado' },
      { m: 'radio', ini: '2026-01-15', fin: '2026-10-31', c: 20000.00, est: 'ejecutado' }
    ]
  },
  {
    n: 13, cli: 8,
    nombre: 'Conoce Tu País con BoA: Vuelos Directos Salar de Uyuni',
    desc: 'Promoción turística invernal con tarifas promocionales hacia Uyuni, Rurrenabaque y Tarija para incentivar el turismo interno.',
    estado: 'activa', ini: '2026-03-01', fin: '2026-06-30',
    total: 145000.00, gastado: 60000.00, pEst: 'consumido',
    medios: [
      { m: 'digital', ini: '2026-03-01', fin: '2026-06-30', c: 60000.00, est: 'ejecutado' },
      { m: 'vallas', ini: '2026-03-15', fin: '2026-06-15', c: 45000.00, est: 'confirmado' },
      { m: 'redes', ini: '2026-03-05', fin: '2026-06-25', c: 40000.00, est: 'ejecutado' }
    ]
  },
  {
    n: 14, cli: 9,
    nombre: 'Mentisan 85 Años: El Alivio de Generaciones',
    desc: 'Campaña conmemorativa de aniversario celebrando el ungüento ícono de las familias bolivianas con spots testimoniales y piezas emotivas.',
    estado: 'pendiente_aprobacion', ini: '2026-05-10', fin: '2026-08-31',
    total: 175000.00, gastado: 0.00, pEst: 'reservado',
    medios: [
      { m: 'tv', ini: '2026-05-15', fin: '2026-07-31', c: 80000.00, est: 'planificado' },
      { m: 'redes', ini: '2026-05-10', fin: '2026-08-25', c: 45000.00, est: 'planificado' },
      { m: 'vallas', ini: '2026-05-20', fin: '2026-08-20', c: 30000.00, est: 'planificado' },
      { m: 'radio', ini: '2026-05-15', fin: '2026-08-15', c: 20000.00, est: 'planificado' }
    ]
  },
  {
    n: 15, cli: 10,
    nombre: 'Suzuki New Swift Hybrid 2026: Rendimiento Inteligente',
    desc: 'Lanzamiento del compacto híbrido autorecargable con pruebas de manejo en showroom y planes de financiamiento con 0% de cuota inicial.',
    estado: 'cancelada', ini: '2026-01-10', fin: '2026-03-31',
    total: 120000.00, gastado: 15000.00, pEst: 'liberado',
    medios: [
      { m: 'digital', ini: '2026-01-10', fin: '2026-02-15', c: 50000.00, est: 'cancelado' },
      { m: 'vallas', ini: '2026-01-15', fin: '2026-02-28', c: 40000.00, est: 'cancelado' },
      { m: 'redes', ini: '2026-01-10', fin: '2026-02-20', c: 30000.00, est: 'cancelado' }
    ]
  }
];

let sql = '-- ============================================================================\n';
sql += '-- Semillas Completas AdOrbit | Supabase #1 (ms-campanas)\n';
sql += '-- Total: 15 Campañas, 15 Presupuestos, 52 Medios, 3 SAGAs, 12 Pasos, Outbox\n';
sql += '-- IDs cortos de 4-5 caracteres legibles: Campañas (..c001), Medios (..d001), Clientes (..0001)\n';
sql += '-- ============================================================================\n\n';

sql += 'DELETE FROM saga_pasos;\n';
sql += 'DELETE FROM saga_transacciones;\n';
sql += 'DELETE FROM calendario_medios;\n';
sql += 'DELETE FROM presupuestos;\n';
sql += 'DELETE FROM campanas;\n';
sql += 'DELETE FROM bandeja_salida_eventos;\n';
sql += 'DELETE FROM claves_idempotencia;\n\n';

sql += '-- 1. INSERCION DE 15 CAMPANAS REALES (IDs: c001 a c015)\n';
sql += 'INSERT INTO campanas (id, cliente_id, nombre, descripcion, estado, fecha_inicio, fecha_fin, version)\nVALUES\n';
const cRows = campaigns.map(c => {
  const nom = c.nombre.replace(/'/g, "''");
  const des = c.desc.replace(/'/g, "''");
  return `  ('${cId(c.n)}', '${cliId(c.cli)}', '${nom}', '${des}', '${c.estado}', '${c.ini}', '${c.fin}', 1)`;
});
sql += cRows.join(',\n') + ';\n\n';

sql += '-- 2. INSERCION DE 15 PRESUPUESTOS (IDs: b001 a b015)\n';
sql += 'INSERT INTO presupuestos (id, campana_id, monto_total, monto_gastado, moneda, estado, version)\nVALUES\n';
const bRows = campaigns.map(c => {
  return `  ('${bId(c.n)}', '${cId(c.n)}', ${c.total.toFixed(2)}, ${c.gastado.toFixed(2)}, 'BOB', '${c.pEst}', 1)`;
});
sql += bRows.join(',\n') + ';\n\n';

sql += '-- 3. INSERCION DE 52 MEDIOS CALENDARIO (IDs: d001 a d052)\n';
sql += 'INSERT INTO calendario_medios (id, campana_id, medio, fecha_inicio, fecha_fin, costo, estado, version)\nVALUES\n';
let mCount = 1;
const mRows = [];
campaigns.forEach(c => {
  c.medios.forEach(m => {
    mRows.push(`  ('${dId(mCount++)}', '${cId(c.n)}', '${m.m}', '${m.ini}', '${m.fin}', ${m.c.toFixed(2)}, '${m.est}', 1)`);
  });
});
sql += mRows.join(',\n') + ';\n\n';

sql += '-- 4. INSERCION DE SAGAS DE CONTRATACION (IDs: 5a01 a 5a03)\n';
sql += 'INSERT INTO saga_transacciones (id, campana_id, clave_idempotencia, estado, paso_actual, motivo_fallo, version)\nVALUES\n';
sql += `  ('${sId(1)}', '${cId(1)}', 'idemp-contratar-c001', 'completada', 5, NULL, 1),\n`;
sql += `  ('${sId(2)}', '${cId(3)}', 'idemp-contratar-c003', 'reservando_credito', 2, NULL, 1),\n`;
sql += `  ('${sId(3)}', '${cId(15)}', 'idemp-contratar-c015', 'compensada', 3, 'Cliente cancelo operacion antes de facturar', 1);\n\n`;

sql += '-- 5. PASOS DE CADA SAGA (IDs: 5101 a 5112)\n';
sql += 'INSERT INTO saga_pasos (id, saga_id, orden, tipo, servicio, accion, clave_comando, estado, intentos)\nVALUES\n';
sql += `  ('${spId(1)}', '${sId(1)}', 1, 'accion', 'ms-campanas', 'reservar_presupuesto', '5a01:1:accion', 'exitoso', 1),\n`;
sql += `  ('${spId(2)}', '${sId(1)}', 2, 'accion', 'ms-clientes-crm', 'reservar_credito', '5a01:2:accion', 'exitoso', 1),\n`;
sql += `  ('${spId(3)}', '${sId(1)}', 3, 'accion', 'ms-creatividades', 'bloquear_piezas', '5a01:3:accion', 'exitoso', 1),\n`;
sql += `  ('${spId(4)}', '${sId(1)}', 4, 'accion', 'ms-facturacion', 'emitir_factura', '5a01:4:accion', 'exitoso', 1),\n`;
sql += `  ('${spId(5)}', '${sId(1)}', 5, 'accion', 'ms-campanas', 'activar_campana', '5a01:5:accion', 'exitoso', 1),\n`;
sql += `  ('${spId(6)}', '${sId(2)}', 1, 'accion', 'ms-campanas', 'reservar_presupuesto', '5a02:1:accion', 'exitoso', 1),\n`;
sql += `  ('${spId(7)}', '${sId(2)}', 2, 'accion', 'ms-clientes-crm', 'reservar_credito', '5a02:2:accion', 'pendiente', 0),\n`;
sql += `  ('${spId(8)}', '${sId(3)}', 1, 'accion', 'ms-campanas', 'reservar_presupuesto', '5a03:1:accion', 'exitoso', 1),\n`;
sql += `  ('${spId(9)}', '${sId(3)}', 2, 'accion', 'ms-clientes-crm', 'reservar_credito', '5a03:2:accion', 'exitoso', 1),\n`;
sql += `  ('${spId(10)}', '${sId(3)}', 3, 'accion', 'ms-creatividades', 'bloquear_piezas', '5a03:3:accion', 'fallido', 1),\n`;
sql += `  ('${spId(11)}', '${sId(3)}', 2, 'compensacion', 'ms-clientes-crm', 'liberar_credito', '5a03:2:comp', 'exitoso', 1),\n`;
sql += `  ('${spId(12)}', '${sId(3)}', 1, 'compensacion', 'ms-campanas', 'liberar_presupuesto', '5a03:1:comp', 'exitoso', 1);\n\n`;

sql += '-- 6. BANDEJA DE SALIDA (Outbox Transaccional)\n';
sql += 'INSERT INTO bandeja_salida_eventos (id, tipo_agregado, agregado_id, tipo_evento, carga, publicado_en)\nVALUES\n';
sql += `  ('00000000-0000-0000-0000-00000000e001', 'Campana', '${cId(1)}', 'CampanaCreada', '{\"nombre\": \"Cuenta Joven BMSC\"}', now()),\n`;
sql += `  ('00000000-0000-0000-0000-00000000e002', 'Campana', '${cId(1)}', 'CampanaContratada', '{\"presupuesto\": 185000}', now()),\n`;
sql += `  ('00000000-0000-0000-0000-00000000e003', 'Campana', '${cId(3)}', 'CampanaCreada', '{\"nombre\": \"Paceña Carnaval 2026\"}', now()),\n`;
sql += `  ('00000000-0000-0000-0000-00000000e004', 'Campana', '${cId(9)}', 'CampanaCreada', '{\"nombre\": \"Tigo Hogar Fibra 1000\"}', now()),\n`;
sql += `  ('00000000-0000-0000-0000-00000000e005', 'Campana', '${cId(12)}', 'CampanaCreada', '{\"nombre\": \"Hipermaxi Miércoles Frescura\"}', now());\n\n`;

sql += '-- 7. CLAVES DE IDEMPOTENCIA HISTORICAS\n';
sql += 'INSERT INTO claves_idempotencia (clave, huella_solicitud, estado, codigo_estado, respuesta)\nVALUES\n';
sql += `  ('idem-crear-c001', 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2', 'COMPLETADO', 201, '{\"id\": \"${cId(1)}\", \"estado\": \"activa\"}'),\n`;
sql += `  ('idem-crear-c003', 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3', 'COMPLETADO', 201, '{\"id\": \"${cId(3)}\", \"estado\": \"pendiente_aprobacion\"}'),\n`;
sql += `  ('idem-crear-c009', 'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4', 'COMPLETADO', 201, '{\"id\": \"${cId(9)}\", \"estado\": \"activa\"}');\n`;

fs.writeFileSync('base_de_datos/ms-campanas.semillas.sql', sql, 'utf8');
console.log('base_de_datos/ms-campanas.semillas.sql generado con exito!');

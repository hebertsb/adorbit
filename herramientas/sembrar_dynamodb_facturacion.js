const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TABLE = 'AdOrbitFacturacion';
const REGION = 'us-east-1';

// Helpers para UUID y formato corto
const pad = (n, len = 2) => String(n).padStart(len, '0');
const cliId = (n) => '00000000-0000-0000-0000-0000000000' + pad(n);
const cId = (n) => '00000000-0000-0000-0000-00000000c' + String(n).padStart(3, '0');
const fId = (n) => '00000000-0000-0000-0000-00000000f' + String(n).padStart(3, '0');
const cbId = (n) => '00000000-0000-0000-0000-00000000cb' + pad(n);
const ncId = (n) => '00000000-0000-0000-0000-00000000nc' + pad(n);
const evtId = (n) => '00000000-0000-0000-0000-00000000e' + String(n).padStart(3, '0');

const facturas = [
  {
    n: 1, cli: 1, c: 1, total: 185000.00, est: 'EMITIDA',
    fEmi: '2026-02-01', fVenc: '2026-03-03',
    items: [
      { d: 'Pauta Redes Sociales (Instagram & TikTok Ads)', c: 1, p: 65000.00 },
      { d: 'Campaña Digital Programática & Search', c: 1, p: 45000.00 },
      { d: 'Vallas Vía Pública Eje Troncal (4to Anillo SCZ)', c: 1, p: 40000.00 },
      { d: 'Pauta Radial Frecuencia Modulada (La Paz/CBB/SCZ)', c: 1, p: 35000.00 }
    ],
    cobros: [
      { n: 1, m: 92400.00, met: 'QR', f: '2026-02-05', ref: 'QR-BMSC-20260205-01' }
    ]
  },
  {
    n: 2, cli: 1, c: 2, total: 220000.00, est: 'PAGADA',
    fEmi: '2025-10-01', fVenc: '2025-11-01',
    items: [
      { d: 'Pauta Televisiva Nacional Horario Estelar', c: 1, p: 100000.00 },
      { d: 'Avisos Prensa Escrita Separata Económica', c: 1, p: 45000.00 },
      { d: 'Estrategia Digital Redes & Display', c: 1, p: 50000.00 },
      { d: 'Circuito de Vallas Perimetrales Santa Cruz', c: 1, p: 25000.00 }
    ],
    cobros: [
      { n: 2, m: 220000.00, met: 'TRANSFERENCIA', f: '2025-10-15', ref: 'ACH-BMSC-9921001' }
    ]
  },
  {
    n: 3, cli: 2, c: 4, total: 130000.00, est: 'EMITIDA',
    fEmi: '2026-03-01', fVenc: '2026-04-01',
    items: [
      { d: 'Producción & Pauta Digital Huari Orígenes', c: 1, p: 50000.00 },
      { d: 'Pauta Redes Sociales Microcápsulas Gastronómicas', c: 1, p: 45000.00 },
      { d: 'Publirreportajes en Revistas Especializadas', c: 1, p: 35000.00 }
    ],
    cobros: [
      { n: 3, m: 45000.00, met: 'TRANSFERENCIA', f: '2026-03-10', ref: 'TR-BNB-CBN-3401' }
    ]
  },
  {
    n: 4, cli: 3, c: 5, total: 95000.00, est: 'PAGADA',
    fEmi: '2026-01-20', fVenc: '2026-02-20',
    items: [
      { d: 'Pauta Digital Vuelta a Clases Sofía', c: 1, p: 35000.00 },
      { d: 'Material Gráfico Góndolas & Prensa', c: 1, p: 32000.00 },
      { d: 'Cuñas Radiales Cadena Nacional', c: 1, p: 28000.00 }
    ],
    cobros: [
      { n: 4, m: 95000.00, met: 'CHEQUE', f: '2026-01-28', ref: 'CHQ-BUNION-SOF-881' }
    ]
  },
  {
    n: 5, cli: 4, c: 7, total: 80000.00, est: 'EMITIDA',
    fEmi: '2026-04-15', fVenc: '2026-05-15',
    items: [
      { d: 'Pauta Redes Sociales Campaña Antigripal', c: 1, p: 35000.00 },
      { d: 'Spots TV Cable & Canales Locales', c: 1, p: 25000.00 },
      { d: 'Menciones Radiales Programa Médico', c: 1, p: 20000.00 }
    ],
    cobros: [
      { n: 5, m: 25000.00, met: 'TRANSFERENCIA', f: '2026-04-20', ref: 'TR-BCP-CHAVEZ-112' }
    ]
  },
  {
    n: 6, cli: 5, c: 9, total: 280000.00, est: 'PAGADA',
    fEmi: '2026-01-15', fVenc: '2026-02-15',
    items: [
      { d: 'Pauta Televisiva TV Abierta Eje Troncal Fibra 1000', c: 1, p: 120000.00 },
      { d: 'Campaña Masiva Redes Sociales & Influencers', c: 1, p: 80000.00 },
      { d: 'Vallas Espectaculares Santa Cruz & La Paz', c: 1, p: 50000.00 },
      { d: 'Menciones en Radios Juveniles & Deportivas', c: 1, p: 30000.00 }
    ],
    cobros: [
      { n: 6, m: 175000.00, met: 'TRANSFERENCIA', f: '2026-01-25', ref: 'ACH-TIGO-88192' },
      { n: 7, m: 105000.00, met: 'TRANSFERENCIA', f: '2026-02-10', ref: 'ACH-TIGO-88245' }
    ]
  },
  {
    n: 7, cli: 5, c: 10, total: 90000.00, est: 'EMITIDA',
    fEmi: '2026-02-01', fVenc: '2026-03-01',
    items: [
      { d: 'Pauta Redes Sociales Tigo Money QR', c: 1, p: 45000.00 },
      { d: 'Cuñas Radiales Mercados & Zonas Comerciales', c: 1, p: 25000.00 },
      { d: 'Vallas Perimetrales Puntos de Cobro', c: 1, p: 20000.00 }
    ],
    cobros: [
      { n: 8, m: 64000.00, met: 'QR', f: '2026-02-15', ref: 'QR-TMONEY-3391' }
    ]
  },
  {
    n: 8, cli: 6, c: 11, total: 210000.00, est: 'PAGADA',
    fEmi: '2025-12-01', fVenc: '2026-01-05',
    items: [
      { d: 'Pauta TV Spot Coca-Cola Verano', c: 1, p: 90000.00 },
      { d: 'Vallas Ruteras Doble Vía La Guardia', c: 1, p: 60000.00 },
      { d: 'Redes Sociales & Pauta Digital Verano', c: 1, p: 40000.00 },
      { d: 'Activaciones Digitales Balnearios', c: 1, p: 20000.00 }
    ],
    cobros: [
      { n: 9, m: 210000.00, met: 'TRANSFERENCIA', f: '2025-12-20', ref: 'ACH-EMBOL-77123' }
    ]
  },
  {
    n: 9, cli: 7, c: 12, total: 160000.00, est: 'EMITIDA',
    fEmi: '2026-01-01', fVenc: '2026-02-01',
    items: [
      { d: 'Prensa Escrita Semanal El Deber & Los Tiempos', c: 1, p: 60000.00 },
      { d: 'Redes Sociales Ofertas Miércoles de Frescura', c: 1, p: 50000.00 },
      { d: 'Pauta TV Canales Regionales', c: 1, p: 30000.00 },
      { d: 'Cuñas Radio Matinales', c: 1, p: 20000.00 }
    ],
    cobros: [
      { n: 10, m: 53300.00, met: 'TRANSFERENCIA', f: '2026-01-15', ref: 'TR-HIPER-44910' }
    ]
  },
  {
    n: 10, cli: 8, c: 13, total: 145000.00, est: 'EMITIDA',
    fEmi: '2026-03-01', fVenc: '2026-04-01',
    items: [
      { d: 'Campaña Digital BoA Uyuni Directo', c: 1, p: 60000.00 },
      { d: 'Vallas Aeropuertos Viru Viru & El Alto', c: 1, p: 45000.00 },
      { d: 'Redes Sociales Promociones Turismo Interno', c: 1, p: 40000.00 }
    ],
    cobros: [
      { n: 11, m: 60000.00, met: 'TRANSFERENCIA', f: '2026-03-12', ref: 'TR-BOA-UYUNI-01' }
    ]
  },
  {
    n: 11, cli: 9, c: 14, total: 110000.00, est: 'EMITIDA',
    fEmi: '2026-11-01', fVenc: '2026-11-15',
    items: [
      { d: 'Pauta Digital admisión semestral UPB Executive MBA', c: 1, p: 65000.00 },
      { d: 'Prensa Ejecutiva & Revistas de Negocios', c: 1, p: 45000.00 }
    ],
    cobros: []
  },
  {
    n: 12, cli: 10, c: 15, total: 120000.00, est: 'VENCIDA',
    fEmi: '2026-09-01', fVenc: '2026-10-01',
    items: [
      { d: 'Lanzamiento Digital Suzuki Swift Hybrid 2026', c: 1, p: 70000.00 },
      { d: 'Circuito Vallas Showroom Imcruz', c: 1, p: 50000.00 }
    ],
    cobros: []
  },
  {
    n: 13, cli: 11, c: 16, total: 175000.00, est: 'EMITIDA',
    fEmi: '2026-11-02', fVenc: '2026-11-18',
    items: [
      { d: 'Pauta Televisiva PIL Andina Desayuno Escolar', c: 1, p: 105000.00 },
      { d: 'Redes Sociales & Influencers Familiares', c: 1, p: 70000.00 }
    ],
    cobros: []
  },
  {
    n: 14, cli: 12, c: 17, total: 320000.00, est: 'PAGADA',
    fEmi: '2026-09-10', fVenc: '2026-10-10',
    items: [
      { d: 'Campaña Nacional Entel 5G Cobertura Total TV', c: 1, p: 180000.00 },
      { d: 'Vallas Espectaculares Eje Troncal', c: 1, p: 80000.00 },
      { d: 'Pauta Digital Programática', c: 1, p: 60000.00 }
    ],
    cobros: [
      { n: 12, m: 320000.00, met: 'TRANSFERENCIA', f: '2026-10-02', ref: 'ACH-ENTEL-5G-009' }
    ]
  },
  {
    n: 15, cli: 13, c: 18, total: 195000.00, est: 'EMITIDA',
    fEmi: '2026-11-03', fVenc: '2026-11-22',
    items: [
      { d: 'Campaña Digital BNB Banca Joven & App Móvil', c: 1, p: 115000.00 },
      { d: 'Vallas Digitales LED Santa Cruz & La Paz', c: 1, p: 80000.00 }
    ],
    cobros: []
  },
  {
    n: 16, cli: 14, c: 19, total: 140000.00, est: 'VENCIDA',
    fEmi: '2026-08-20', fVenc: '2026-09-20',
    items: [
      { d: 'Feria de la Construcción Soboce Viacha & Warnes', c: 1, p: 85000.00 },
      { d: 'Cuñas Radiales Sindicatos Constructores', c: 1, p: 55000.00 }
    ],
    cobros: []
  },
  {
    n: 17, cli: 15, c: 20, total: 165000.00, est: 'PAGADA',
    fEmi: '2026-09-15', fVenc: '2026-10-15',
    items: [
      { d: 'Campaña Digital Fino Tradición Familiar', c: 1, p: 95000.00 },
      { d: 'Menciones en Programas de Cocina TV', c: 1, p: 70000.00 }
    ],
    cobros: [
      { n: 13, m: 165000.00, met: 'TRANSFERENCIA', f: '2026-10-10', ref: 'ACH-FINO-2026-10' }
    ]
  },
  {
    n: 18, cli: 16, c: 21, total: 88000.00, est: 'EMITIDA',
    fEmi: '2026-11-04', fVenc: '2026-11-25',
    items: [
      { d: 'Pauta Redes Sociales Laboratorios Bagó Línea Pediátrica', c: 1, p: 52000.00 },
      { d: 'Revistas Médicas & Portales Salud', c: 1, p: 36000.00 }
    ],
    cobros: []
  },
  {
    n: 19, cli: 17, c: 22, total: 210000.00, est: 'VENCIDA',
    fEmi: '2026-09-05', fVenc: '2026-10-05',
    items: [
      { d: 'Lanzamiento Toyota Hilux 2026 Toyosa TV & Vallas', c: 1, p: 130000.00 },
      { d: 'Pauta Digital Test Drive Nacional', c: 1, p: 80000.00 }
    ],
    cobros: []
  },
  {
    n: 20, cli: 18, c: 23, total: 150000.00, est: 'EMITIDA',
    fEmi: '2026-11-05', fVenc: '2026-12-05',
    items: [
      { d: 'Campaña Nacional Banco BISA e-BISA Empresarial', c: 1, p: 90000.00 },
      { d: 'Prensa Financiera & LinkedIn Ads', c: 1, p: 60000.00 }
    ],
    cobros: []
  }
];

const items = [];

// 1. Facturas (META)
facturas.forEach(f => {
  const cobrado = f.cobros.reduce((acc, cb) => acc + cb.m, 0);
  const estLower = f.est.toLowerCase();
  const saldo = estLower === 'pagada' ? 0 : Math.max(0, f.total - cobrado);
  const subtotal = Number((f.total / 1.13).toFixed(2));
  const impuestos = Number((f.total - subtotal).toFixed(2));
  const estadoReal = (estLower === 'emitida' && cobrado > 0 && saldo > 0) ? 'pagada_parcial' : estLower;

  items.push({
    PK: { S: `FACT#${fId(f.n)}` },
    SK: { S: 'META' },
    tipo: { S: 'FACTURA' },
    id: { S: fId(f.n) },
    cliente_id: { S: cliId(f.cli) },
    campana_id: { S: cId(f.c) },
    subtotal: { N: subtotal.toFixed(2) },
    impuestos: { N: impuestos.toFixed(2) },
    total: { N: f.total.toFixed(2) },
    saldo: { N: saldo.toFixed(2) },
    moneda: { S: 'BOB' },
    estado: { S: estadoReal },
    fecha_emision: { S: f.fEmi },
    fecha_vencimiento: { S: f.fVenc },
    version: { N: '1' },
    GSI1PK: { S: `CLI#${cliId(f.cli)}` },
    GSI1SK: { S: `${f.fEmi}#${fId(f.n)}` },
    GSI2PK: { S: `ESTADO#${estadoReal}` },
    GSI2SK: { S: `${f.fVenc}#${fId(f.n)}` }
  });

  // Items de factura
  f.items.forEach((it, idx) => {
    items.push({
      PK: { S: `FACT#${fId(f.n)}` },
      SK: { S: `ITEM#${String(idx + 1).padStart(3, '0')}` },
      numero: { N: String(idx + 1) },
      descripcion: { S: it.d },
      cantidad: { N: String(it.c) },
      precio_unitario: { N: it.p.toFixed(2) },
      subtotal: { N: it.p.toFixed(2) },
      moneda: { S: 'BOB' }
    });
  });

  // Cobros
  f.cobros.forEach(cb => {
    items.push({
      PK: { S: `FACT#${fId(f.n)}` },
      SK: { S: `COBRO#${cbId(cb.n)}` },
      id: { S: cbId(cb.n) },
      cobro_id: { S: cbId(cb.n) },
      factura_id: { S: fId(f.n) },
      monto: { N: cb.m.toFixed(2) },
      moneda: { S: 'BOB' },
      metodo: { S: cb.met },
      fecha: { S: cb.f },
      fecha_pago: { S: cb.f },
      referencia: { S: cb.ref }
    });
  });
});

// 2. Nota de Crédito (SAGA Compensación por cancelación c015 / SAGA 5a03)
items.push({
  PK: { S: `NC#${ncId(1)}` },
  SK: { S: 'META' },
  id: { S: ncId(1) },
  factura_id: { S: '00000000-0000-0000-0000-00000000f015' },
  cliente_id: { S: cliId(10) },
  motivo: { S: 'Compensacion SAGA 5a03 por cancelacion de campana Suzuki Swift' },
  total: { N: '120000.00' },
  moneda: { S: 'BOB' },
  creado_en: { S: '2026-01-10T14:35:00Z' },
  GSI1PK: { S: `CLI#${cliId(10)}` },
  GSI1SK: { S: '2026-01-10' }
});

// 3. Claves de Idempotencia SAGA
items.push({
  PK: { S: 'IDEMP#5a01:4:accion' },
  SK: { S: 'META' },
  clave: { S: '5a01:4:accion' },
  huella_solicitud: { S: 'c4d5e6f7a8b9c4d5e6f7a8b9c4d5e6f7a8b9c4d5e6f7a8b9c4d5e6f7a8b9c4d5' },
  estado: { S: 'COMPLETADO' },
  codigo_estado: { N: '200' },
  respuesta: { S: JSON.stringify({ factura_id: fId(1), estado: 'EMITIDA', total: 185000.00 }) },
  vence_epoch: { N: '1793500000' }
});

// 4. Bandeja de Salida (Outbox Transaccional)
items.push(
  {
    PK: { S: `SALIDA#${evtId(301)}` },
    SK: { S: 'META' },
    tipo_evento: { S: 'FacturaEmitida' },
    agregado_id: { S: `FACT#${fId(1)}` },
    carga: { S: JSON.stringify({ id_evento: evtId(301), factura_id: fId(1), total: 185000.00, moneda: 'BOB' }) },
    creado_en: { S: '2026-02-01T12:03:00Z' },
    vence_epoch: { N: '1793500000' }
  },
  {
    PK: { S: `SALIDA#${evtId(302)}` },
    SK: { S: 'META' },
    tipo_evento: { S: 'CobroRegistrado' },
    agregado_id: { S: `FACT#${fId(1)}` },
    carga: { S: JSON.stringify({ id_evento: evtId(302), cobro_id: cbId(1), monto: 92400.00, metodo: 'QR' }) },
    creado_en: { S: '2026-02-05T10:15:00Z' },
    vence_epoch: { N: '1793500000' }
  },
  {
    PK: { S: `SALIDA#${evtId(303)}` },
    SK: { S: 'META' },
    tipo_evento: { S: 'FacturaEmitida' },
    agregado_id: { S: `FACT#${fId(6)}` },
    carga: { S: JSON.stringify({ id_evento: evtId(303), factura_id: fId(6), total: 280000.00, moneda: 'BOB' }) },
    creado_en: { S: '2026-01-15T11:00:00Z' },
    vence_epoch: { N: '1793500000' }
  }
);

console.log(`Total items preparados para DynamoDB: ${items.length}`);

// Guardar en batches de maximo 25 items (limite de batch-write-item)
const BATCH_SIZE = 25;
const batchFiles = [];

for (let i = 0; i < items.length; i += BATCH_SIZE) {
  const batch = items.slice(i, i + BATCH_SIZE);
  const payload = {
    [TABLE]: batch.map(it => ({
      PutRequest: {
        Item: it
      }
    }))
  };
  const batchNum = Math.floor(i / BATCH_SIZE) + 1;
  const filePath = path.join(__dirname, `dynamo_batch_${batchNum}.json`);
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
  batchFiles.push(filePath);
}

console.log(`Generados ${batchFiles.length} archivos batch para DynamoDB.`);

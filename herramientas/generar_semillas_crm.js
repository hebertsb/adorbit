const fs = require('fs');

const pad = (n, len = 2) => String(n).padStart(len, '0');
const cliId = (n) => '00000000-0000-0000-0000-0000000000' + pad(n);
const conId = (n) => '00000000-0000-0000-0000-00000000a' + String(n).padStart(3, '0');
const resId = (n) => '00000000-0000-0000-0000-00000000ce' + pad(n);
const cId = (n) => '00000000-0000-0000-0000-00000000c' + String(n).padStart(3, '0');
const sId = (n) => '00000000-0000-0000-0000-000000005a' + pad(n);
const evtId = (n) => '00000000-0000-0000-0000-00000000e' + String(n).padStart(3, '0');

const clients = [
  {
    n: 1,
    razon_social: 'Banco Mercantil Santa Cruz S.A.',
    nit: '1020304028',
    estado: 'activo',
    contactos: [
      { nombre: 'Lic. Mariana Siles Justiniano', email: 'msiles@bmsc.com.bo', telefono: '+591 3 3369000', rol: 'Gerente Nacional de Marketing' },
      { nombre: 'Ing. Carlos Rodrigo Saavedra', email: 'csaavedra@bmsc.com.bo', telefono: '+591 77012345', rol: 'Jefe de Medios Digitales' }
    ],
    linea_credito: { limite: 500000.00, usado: 185000.00, moneda: 'BOB' }
  },
  {
    n: 2,
    razon_social: 'Cervecería Boliviana Nacional S.A.',
    nit: '1020456021',
    estado: 'activo',
    contactos: [
      { nombre: 'Lic. Alejandro Decker Monje', email: 'adecker@cbn.com.bo', telefono: '+591 2 2450000', rol: 'Brand Manager Paceña' },
      { nombre: 'Lic. Valeria Hurtado Paz', email: 'vhurtado@cbn.com.bo', telefono: '+591 78567890', rol: 'Coordinadora de Eventos y BTL' }
    ],
    linea_credito: { limite: 1200000.00, usado: 470000.00, moneda: 'BOB' }
  },
  {
    n: 3,
    razon_social: 'Avícola Sofía Ltda.',
    nit: '1015682024',
    estado: 'activo',
    contactos: [
      { nombre: 'Ing. Jorge Antonio Anglarill', email: 'janglarill@sofia.com.bo', telefono: '+591 3 3465000', rol: 'Director Comercial' },
      { nombre: 'Lic. Claudia Andrea Ribera', email: 'cribera@sofia.com.bo', telefono: '+591 71098765', rol: 'Jefe de Publicidad y Medios' }
    ],
    linea_credito: { limite: 400000.00, usado: 95000.00, moneda: 'BOB' }
  },
  {
    n: 4,
    razon_social: 'Farmacias Chávez S.A.',
    nit: '1028741029',
    estado: 'activo',
    contactos: [
      { nombre: 'Dra. María René Chávez Gutiérrez', email: 'mchavez@farmaciaschavez.com.bo', telefono: '+591 3 3422000', rol: 'Gerente General' },
      { nombre: 'Lic. Fernando Prado Salek', email: 'fprado@farmaciaschavez.com.bo', telefono: '+591 76054321', rol: 'Jefe de Trade Marketing' }
    ],
    linea_credito: { limite: 300000.00, usado: 80000.00, moneda: 'BOB' }
  },
  {
    n: 5,
    razon_social: 'Telecel S.A. (Tigo Bolivia)',
    nit: '1020112025',
    estado: 'activo',
    contactos: [
      { nombre: 'Ing. Juan Pablo Calvo', email: 'jcalvo@tigo.com.bo', telefono: '+591 3 3888000', rol: 'Director B2C & Fibra' },
      { nombre: 'Lic. Natalia Torrez Peinado', email: 'ntorrez@tigo.net.bo', telefono: '+591 77300001', rol: 'Especialista de Marca y Pauta' }
    ],
    linea_credito: { limite: 900000.00, usado: 370000.00, moneda: 'BOB' }
  },
  {
    n: 6,
    razon_social: 'Embotelladoras Bolivianas Unidas S.A. (EMBOL)',
    nit: '1020224023',
    estado: 'activo',
    contactos: [
      { nombre: 'Lic. Sergio Mauricio Daza', email: 'sdaza@embol.com.bo', telefono: '+591 3 3535000', rol: 'Marketing Manager Coca-Cola' },
      { nombre: 'Lic. Jimena Cuéllar Roca', email: 'jcuellar@embol.com.bo', telefono: '+591 78044556', rol: 'Supervisora de Activaciones' }
    ],
    linea_credito: { limite: 800000.00, usado: 210000.00, moneda: 'BOB' }
  },
  {
    n: 7,
    razon_social: 'Hipermaxi S.A.',
    nit: '1017325026',
    estado: 'activo',
    contactos: [
      { nombre: 'Lic. Bernardo Tomelic Durán', email: 'btomelic@hipermaxi.com', telefono: '+591 3 3418000', rol: 'Gerente Nacional de Marketing' },
      { nombre: 'Lic. Sandra Antelo Menacho', email: 'santelo@hipermaxi.com', telefono: '+591 72133445', rol: 'Encargada de Promociones y Prensa' }
    ],
    linea_credito: { limite: 500000.00, usado: 160000.00, moneda: 'BOB' }
  },
  {
    n: 8,
    razon_social: 'Boliviana de Aviación (BoA)',
    nit: '154362025',
    estado: 'activo',
    contactos: [
      { nombre: 'Lic. Ronald Salvatierra Flores', email: 'rsalvatierra@boa.bo', telefono: '+591 4 4166000', rol: 'Gerente Comercial BoA' },
      { nombre: 'Lic. Patricia Beltrán Arce', email: 'pbeltran@boa.bo', telefono: '+591 71755667', rol: 'Coordinadora de Comunicaciones' }
    ],
    linea_credito: { limite: 600000.00, usado: 145000.00, moneda: 'BOB' }
  },
  {
    n: 9,
    razon_social: 'Droguería INTI S.A.',
    nit: '1020339027',
    estado: 'activo',
    contactos: [
      { nombre: 'Lic. Gonzalo Muñoz-Reyes', email: 'gmunozreyes@inti.com.bo', telefono: '+591 2 2224000', rol: 'Director de Unidad Mentisan' },
      { nombre: 'Lic. Gabriela Moreno Pinto', email: 'gmoreno@inti.com.bo', telefono: '+591 76299887', rol: 'Jefa de Producto OTC' }
    ],
    linea_credito: { limite: 350000.00, usado: 0.00, moneda: 'BOB' }
  },
  {
    n: 10,
    razon_social: 'Imcruz Comercial S.A. (Suzuki)',
    nit: '1020548022',
    estado: 'moroso',
    contactos: [
      { nombre: 'Lic. Pablo Daniel Kuncar', email: 'pkuncar@imcruz.com.bo', telefono: '+591 3 3156000', rol: 'Gerente Automotriz Suzuki' },
      { nombre: 'Lic. Laura Velasco Taborga', email: 'lvelasco@imcruz.com.bo', telefono: '+591 77622334', rol: 'Jefa de Campañas y PR' }
    ],
    linea_credito: { limite: 450000.00, usado: 515000.00, moneda: 'BOB' }
  },
  {
    n: 11,
    razon_social: 'Entel S.A.',
    nit: '1020703023',
    estado: 'activo',
    contactos: [
      { nombre: 'Ing. Ramiro Paz Cerruto', email: 'rpaz@entel.bo', telefono: '+591 2 2141000', rol: 'Gerente Nacional de Imagen Corporativa' }
    ],
    linea_credito: { limite: 1000000.00, usado: 420000.00, moneda: 'BOB' }
  },
  {
    n: 12,
    razon_social: 'Banco Nacional de Bolivia S.A. (BNB)',
    nit: '1020215024',
    estado: 'activo',
    contactos: [
      { nombre: 'Lic. Valeria Urquidi Rojas', email: 'vurquidi@bnb.com.bo', telefono: '+591 2 2621000', rol: 'Subgerente de Marketing Digital' }
    ],
    linea_credito: { limite: 750000.00, usado: 250000.00, moneda: 'BOB' }
  },
  {
    n: 13,
    razon_social: 'PIL Andina S.A.',
    nit: '1020755027',
    estado: 'activo',
    contactos: [
      { nombre: 'Lic. Javier Gutiérrez Lozano', email: 'jgutierrez@pilandina.com.bo', telefono: '+591 4 4260164', rol: 'Gerente de Categoría Lácteos' }
    ],
    linea_credito: { limite: 650000.00, usado: 195000.00, moneda: 'BOB' }
  },
  {
    n: 14,
    razon_social: 'Banco Bisa S.A.',
    nit: '1020149021',
    estado: 'activo',
    contactos: [
      { nombre: 'Lic. Natalia Arana Céspedes', email: 'narana@bisa.com', telefono: '+591 2 2317272', rol: 'Jefa de Comunicación Institucional' }
    ],
    linea_credito: { limite: 600000.00, usado: 210000.00, moneda: 'BOB' }
  },
  {
    n: 15,
    razon_social: 'YPFB Refinación S.A.',
    nit: '1028355025',
    estado: 'activo',
    contactos: [
      { nombre: 'Ing. Marco Antonio Soliz', email: 'msoliz@ypfbrefinacion.com.bo', telefono: '+591 3 3560000', rol: 'Director Comercial Lubricantes' }
    ],
    linea_credito: { limite: 950000.00, usado: 310000.00, moneda: 'BOB' }
  },
  {
    n: 16,
    razon_social: 'Nuevatel PCS de Bolivia S.A. (Viva)',
    nit: '1020612028',
    estado: 'moroso',
    contactos: [
      { nombre: 'Lic. Diego Quintanilla', email: 'dquintanilla@viva.com.bo', telefono: '+591 70711223', rol: 'Jefe de Pauta Publicitaria' }
    ],
    linea_credito: { limite: 400000.00, usado: 448000.00, moneda: 'BOB' }
  },
  {
    n: 17,
    razon_social: 'Toyosa S.A.',
    nit: '1020411022',
    estado: 'moroso',
    contactos: [
      { nombre: 'Lic. Sebastián Saavedra', email: 'ssaavedra@toyosa.com', telefono: '+591 3 3425000', rol: 'Gerente de Marketing Nacional' }
    ],
    linea_credito: { limite: 550000.00, usado: 620000.00, moneda: 'BOB' }
  },
  {
    n: 18,
    razon_social: 'Industrias de Aceite S.A. (FINO)',
    nit: '1020388029',
    estado: 'activo',
    contactos: [
      { nombre: 'Lic. Paola Méndez Vaca', email: 'pmendez@fino.com.bo', telefono: '+591 3 3462000', rol: 'Brand Manager Consumo Masivo' }
    ],
    linea_credito: { limite: 500000.00, usado: 165000.00, moneda: 'BOB' }
  },
  {
    n: 19,
    razon_social: 'Laboratorios Bagó de Bolivia S.A.',
    nit: '1020599021',
    estado: 'activo',
    contactos: [
      { nombre: 'Dra. Claudia Terán', email: 'cteran@bago.com.bo', telefono: '+591 2 2770303', rol: 'Gerente de Línea OTC' }
    ],
    linea_credito: { limite: 380000.00, usado: 125000.00, moneda: 'BOB' }
  },
  {
    n: 20,
    razon_social: 'Cine Center Bolivia S.A.',
    nit: '1028914026',
    estado: 'moroso',
    contactos: [
      { nombre: 'Lic. Hernán Monasterio', email: 'hmonasterio@cinecenter.com.bo', telefono: '+591 3 3355555', rol: 'Jefe de Promociones y Cartelera' }
    ],
    linea_credito: { limite: 250000.00, usado: 295000.00, moneda: 'BOB' }
  }
];

const contracts = [
  { n: 1, cli: 1, monto: 450000.00, ini: '2026-01-01', fin: '2026-12-31', est: 'vigente' },
  { n: 2, cli: 1, monto: 380000.00, ini: '2025-01-01', fin: '2025-12-31', est: 'vencido' },
  { n: 3, cli: 2, monto: 1200000.00, ini: '2026-01-01', fin: '2026-12-31', est: 'vigente' },
  { n: 4, cli: 2, monto: 950000.00, ini: '2025-01-01', fin: '2025-12-31', est: 'vencido' },
  { n: 5, cli: 3, monto: 350000.00, ini: '2026-01-15', fin: '2026-12-15', est: 'vigente' },
  { n: 6, cli: 4, monto: 280000.00, ini: '2026-02-01', fin: '2027-01-31', est: 'vigente' },
  { n: 7, cli: 5, monto: 850000.00, ini: '2026-01-01', fin: '2026-12-31', est: 'vigente' },
  { n: 8, cli: 5, monto: 720000.00, ini: '2025-01-01', fin: '2025-12-31', est: 'vencido' },
  { n: 9, cli: 6, monto: 750000.00, ini: '2025-11-01', fin: '2026-10-31', est: 'vigente' },
  { n: 10, cli: 7, monto: 480000.00, ini: '2026-01-01', fin: '2026-12-31', est: 'vigente' },
  { n: 11, cli: 8, monto: 550000.00, ini: '2026-02-15', fin: '2026-11-30', est: 'vigente' },
  { n: 12, cli: 9, monto: 300000.00, ini: '2026-04-01', fin: '2026-12-31', est: 'vigente' },
  { n: 13, cli: 10, monto: 400000.00, ini: '2025-06-01', fin: '2026-03-31', est: 'vencido' },
  { n: 14, cli: 10, monto: 200000.00, ini: '2026-01-01', fin: '2026-06-30', est: 'rescindido' }
];

const reservas = [
  { n: 1, cli: 1, c: 1, s: 1, m: 185000.00, est: 'consumido' },
  { n: 2, cli: 2, c: 3, s: 2, m: 340000.00, est: 'reservado' },
  { n: 3, cli: 10, c: 15, s: 3, m: 120000.00, est: 'liberado' }
];

let js = `// ============================================================================
// Semillas Completas AdOrbit | MongoDB Atlas (ms-clientes-crm)
// DB: adorbit_crm
// Total: 10 Clientes Reales, 14 Contratos, 3 Reservas de Credito SAGA, Outbox
// IDs cortos: Clientes (..0001 a ..0010), Contratos (..a001), Reservas (..ce01)
// ============================================================================

const dbc = db.getSiblingDB("adorbit_crm");

// 0. Creacion segura de colecciones e indices con sus esquemas si no existen
const existingCols = dbc.getCollectionNames();
const uuid = { bsonType: "string", pattern: "^[0-9a-fA-F-]{36}$" };
const moneda = { enum: ["BOB", "USD"] };

if (!existingCols.includes("clientes")) {
  dbc.createCollection("clientes", { validator: { $jsonSchema: {
    bsonType: "object",
    required: ["id", "razon_social", "estado", "creado_en"],
    properties: {
      id: uuid,
      razon_social: { bsonType: "string" },
      nit: { bsonType: ["string", "null"] },
      estado: { enum: ["activo", "inactivo", "moroso"] },
      contactos: { bsonType: "array", items: { bsonType: "object",
        properties: { nombre: { bsonType: "string" }, email: { bsonType: "string" },
                      telefono: { bsonType: "string" }, rol: { bsonType: "string" } } } },
      linea_credito: { bsonType: "object",
        required: ["limite", "usado", "moneda"],
        properties: {
          limite: { bsonType: "decimal", minimum: NumberDecimal("0") },
          usado:  { bsonType: "decimal", minimum: NumberDecimal("0") },
          moneda } },
      version: { bsonType: "number" },
      creado_en: { bsonType: "date" }, actualizado_en: { bsonType: "date" }
    }
  }}, validationLevel: "moderate" });
  dbc.clientes.createIndex({ id: 1 }, { unique: true });
  dbc.clientes.createIndex({ nit: 1 }, { unique: true, partialFilterExpression: { nit: { $type: "string" } } });
  dbc.clientes.createIndex({ estado: 1 });
}

if (!existingCols.includes("contratos")) {
  dbc.createCollection("contratos", { validator: { $jsonSchema: {
    bsonType: "object",
    required: ["id", "cliente_id", "estado", "creado_en"],
    properties: {
      id: uuid, cliente_id: uuid,
      estado: { enum: ["vigente", "vencido", "rescindido"] },
      fecha_inicio: { bsonType: "date" }, fecha_fin: { bsonType: "date" },
      monto: { bsonType: "decimal" }, moneda,
      creado_en: { bsonType: "date" }, actualizado_en: { bsonType: "date" }
    }
  }}});
  dbc.contratos.createIndex({ id: 1 }, { unique: true });
  dbc.contratos.createIndex({ cliente_id: 1, estado: 1 });
}

if (!existingCols.includes("reservas_credito")) {
  dbc.createCollection("reservas_credito", { validator: { $jsonSchema: {
    bsonType: "object",
    required: ["id", "cliente_id", "campana_id", "saga_id", "monto", "moneda", "estado", "creado_en"],
    properties: {
      id: uuid, cliente_id: uuid, campana_id: uuid, saga_id: uuid,
      monto: { bsonType: "decimal", minimum: NumberDecimal("0") },
      moneda,
      estado: { enum: ["reservado", "liberado", "consumido"] },
      creado_en: { bsonType: "date" }, actualizado_en: { bsonType: "date" }
    }
  }}});
  dbc.reservas_credito.createIndex({ id: 1 }, { unique: true });
  dbc.reservas_credito.createIndex({ saga_id: 1 }, { unique: true });
  dbc.reservas_credito.createIndex({ campana_id: 1 }, { unique: true, partialFilterExpression: { estado: "reservado" } });
  dbc.reservas_credito.createIndex({ cliente_id: 1, estado: 1 });
}

if (!existingCols.includes("claves_idempotencia")) {
  dbc.createCollection("claves_idempotencia");
  dbc.claves_idempotencia.createIndex({ clave: 1 }, { unique: true });
  dbc.claves_idempotencia.createIndex({ vence_en: 1 }, { expireAfterSeconds: 0 });
}

if (!existingCols.includes("bandeja_salida_eventos")) {
  dbc.createCollection("bandeja_salida_eventos");
  dbc.bandeja_salida_eventos.createIndex({ id: 1 }, { unique: true });
  dbc.bandeja_salida_eventos.createIndex({ creado_en: 1 }, { partialFilterExpression: { publicado: false } });
}

// 1. Limpieza de colecciones previas
dbc.reservas_credito.deleteMany({});
dbc.contratos.deleteMany({});
dbc.clientes.deleteMany({});
dbc.bandeja_salida_eventos.deleteMany({});
dbc.claves_idempotencia.deleteMany({});

// 2. INSERCION DE 10 CLIENTES REALES (IDs: 0001 a 0010)
dbc.clientes.insertMany([
`;

const cliDocs = clients.map(c => {
  const contactosStr = JSON.stringify(c.contactos, null, 4).replace(/\n/g, '\n    ');
  return `  {
    id: "${cliId(c.n)}",
    razon_social: "${c.razon_social}",
    nit: "${c.nit}",
    estado: "${c.estado}",
    contactos: ${contactosStr},
    linea_credito: {
      limite: NumberDecimal("${c.linea_credito.limite.toFixed(2)}"),
      usado: NumberDecimal("${c.linea_credito.usado.toFixed(2)}"),
      moneda: "${c.linea_credito.moneda}"
    },
    version: 1,
    creado_en: new Date("2025-10-01T08:00:00Z"),
    actualizado_en: new Date("2026-02-01T10:00:00Z")
  }`;
});
js += cliDocs.join(',\n') + '\n]);\n\n';

js += `// 3. INSERCION DE 14 CONTRATOS (IDs: a001 a a014)
dbc.contratos.insertMany([
`;
const conDocs = contracts.map(ct => {
  return `  {
    id: "${conId(ct.n)}",
    cliente_id: "${cliId(ct.cli)}",
    estado: "${ct.est}",
    fecha_inicio: new Date("${ct.ini}T00:00:00Z"),
    fecha_fin: new Date("${ct.fin}T23:59:59Z"),
    monto: NumberDecimal("${ct.monto.toFixed(2)}"),
    moneda: "BOB",
    creado_en: new Date("${ct.ini}T00:00:00Z"),
    actualizado_en: new Date("${ct.ini}T00:00:00Z")
  }`;
});
js += conDocs.join(',\n') + '\n]);\n\n';

js += `// 4. INSERCION DE RESERVAS DE CREDITO SAGA (IDs: ce01 a ce03)
dbc.reservas_credito.insertMany([
`;
const resDocs = reservas.map(r => {
  return `  {
    id: "${resId(r.n)}",
    cliente_id: "${cliId(r.cli)}",
    campana_id: "${cId(r.c)}",
    saga_id: "${sId(r.s)}",
    monto: NumberDecimal("${r.m.toFixed(2)}"),
    moneda: "BOB",
    estado: "${r.est}",
    creado_en: new Date("2026-02-01T12:00:00Z"),
    actualizado_en: new Date("2026-02-01T12:05:00Z")
  }`;
});
js += resDocs.join(',\n') + '\n]);\n\n';

js += `// 5. BANDEJA DE SALIDA (Outbox Transaccional CRM)
dbc.bandeja_salida_eventos.insertMany([
  {
    id: "${evtId(101)}",
    tipo_agregado: "Cliente",
    agregado_id: "${cliId(1)}",
    tipo_evento: "CreditoReservado",
    carga: {
      reserva_id: "${resId(1)}",
      cliente_id: "${cliId(1)}",
      campana_id: "${cId(1)}",
      monto: 185000.00,
      moneda: "BOB"
    },
    publicado: true,
    creado_en: new Date("2026-02-01T12:01:00Z")
  },
  {
    id: "${evtId(102)}",
    tipo_agregado: "Cliente",
    agregado_id: "${cliId(2)}",
    tipo_evento: "CreditoReservado",
    carga: {
      reserva_id: "${resId(2)}",
      cliente_id: "${cliId(2)}",
      campana_id: "${cId(3)}",
      monto: 340000.00,
      moneda: "BOB"
    },
    publicado: true,
    creado_en: new Date("2026-02-10T09:15:00Z")
  },
  {
    id: "${evtId(103)}",
    tipo_agregado: "Cliente",
    agregado_id: "${cliId(10)}",
    tipo_evento: "CreditoLiberado",
    carga: {
      reserva_id: "${resId(3)}",
      cliente_id: "${cliId(10)}",
      campana_id: "${cId(15)}",
      motivo: "Compensacion SAGA por cancelacion de cliente"
    },
    publicado: true,
    creado_en: new Date("2026-01-10T14:30:00Z")
  }
]);

// 6. CLAVES DE IDEMPOTENCIA HISTORICAS (Comandos SAGA)
dbc.claves_idempotencia.insertMany([
  {
    clave: "5a01:2:accion",
    huella_solicitud: "f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2",
    estado: "COMPLETADO",
    codigo_estado: 200,
    respuesta: { reserva_id: "${resId(1)}", estado: "reservado" },
    creado_en: new Date("2026-02-01T12:01:00Z"),
    vence_en: new Date("2026-03-01T12:01:00Z")
  },
  {
    clave: "5a02:2:accion",
    huella_solicitud: "e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3",
    estado: "COMPLETADO",
    codigo_estado: 200,
    respuesta: { reserva_id: "${resId(2)}", estado: "reservado" },
    creado_en: new Date("2026-02-10T09:15:00Z"),
    vence_en: new Date("2026-03-10T09:15:00Z")
  },
  {
    clave: "5a03:2:comp",
    huella_solicitud: "d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4",
    estado: "COMPLETADO",
    codigo_estado: 200,
    respuesta: { reserva_id: "${resId(3)}", estado: "liberado" },
    creado_en: new Date("2026-01-10T14:30:00Z"),
    vence_en: new Date("2026-02-10T14:30:00Z")
  }
]);

print("====================================================================");
print("Semillas de ms-clientes-crm sembradas con exito en adorbit_crm!");
print("Clientes insertados: " + dbc.clientes.countDocuments());
print("Contratos insertados: " + dbc.contratos.countDocuments());
print("Reservas de credito SAGA: " + dbc.reservas_credito.countDocuments());
print("Eventos Outbox: " + dbc.bandeja_salida_eventos.countDocuments());
print("====================================================================");
`;

fs.writeFileSync('base_de_datos/ms-clientes-crm.semillas.js', js, 'utf8');
console.log('base_de_datos/ms-clientes-crm.semillas.js generado con exito!');

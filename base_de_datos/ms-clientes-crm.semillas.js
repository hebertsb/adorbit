// ============================================================================
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
  {
    id: "00000000-0000-0000-0000-000000000001",
    razon_social: "Banco Mercantil Santa Cruz S.A.",
    nit: "1020304028",
    estado: "activo",
    contactos: [
        {
            "nombre": "Lic. Mariana Siles Justiniano",
            "email": "msiles@bmsc.com.bo",
            "telefono": "+591 3 3369000",
            "rol": "Gerente Nacional de Marketing"
        },
        {
            "nombre": "Ing. Carlos Rodrigo Saavedra",
            "email": "csaavedra@bmsc.com.bo",
            "telefono": "+591 77012345",
            "rol": "Jefe de Medios Digitales"
        }
    ],
    linea_credito: {
      limite: NumberDecimal("500000.00"),
      usado: NumberDecimal("185000.00"),
      moneda: "BOB"
    },
    version: 1,
    creado_en: new Date("2025-10-01T08:00:00Z"),
    actualizado_en: new Date("2026-02-01T10:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    razon_social: "Cervecería Boliviana Nacional S.A.",
    nit: "1020456021",
    estado: "activo",
    contactos: [
        {
            "nombre": "Lic. Alejandro Decker Monje",
            "email": "adecker@cbn.com.bo",
            "telefono": "+591 2 2450000",
            "rol": "Brand Manager Paceña"
        },
        {
            "nombre": "Lic. Valeria Hurtado Paz",
            "email": "vhurtado@cbn.com.bo",
            "telefono": "+591 78567890",
            "rol": "Coordinadora de Eventos y BTL"
        }
    ],
    linea_credito: {
      limite: NumberDecimal("1200000.00"),
      usado: NumberDecimal("470000.00"),
      moneda: "BOB"
    },
    version: 1,
    creado_en: new Date("2025-10-01T08:00:00Z"),
    actualizado_en: new Date("2026-02-01T10:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    razon_social: "Avícola Sofía Ltda.",
    nit: "1015682024",
    estado: "activo",
    contactos: [
        {
            "nombre": "Ing. Jorge Antonio Anglarill",
            "email": "janglarill@sofia.com.bo",
            "telefono": "+591 3 3465000",
            "rol": "Director Comercial"
        },
        {
            "nombre": "Lic. Claudia Andrea Ribera",
            "email": "cribera@sofia.com.bo",
            "telefono": "+591 71098765",
            "rol": "Jefe de Publicidad y Medios"
        }
    ],
    linea_credito: {
      limite: NumberDecimal("400000.00"),
      usado: NumberDecimal("95000.00"),
      moneda: "BOB"
    },
    version: 1,
    creado_en: new Date("2025-10-01T08:00:00Z"),
    actualizado_en: new Date("2026-02-01T10:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    razon_social: "Farmacias Chávez S.A.",
    nit: "1028741029",
    estado: "activo",
    contactos: [
        {
            "nombre": "Dra. María René Chávez Gutiérrez",
            "email": "mchavez@farmaciaschavez.com.bo",
            "telefono": "+591 3 3422000",
            "rol": "Gerente General"
        },
        {
            "nombre": "Lic. Fernando Prado Salek",
            "email": "fprado@farmaciaschavez.com.bo",
            "telefono": "+591 76054321",
            "rol": "Jefe de Trade Marketing"
        }
    ],
    linea_credito: {
      limite: NumberDecimal("300000.00"),
      usado: NumberDecimal("80000.00"),
      moneda: "BOB"
    },
    version: 1,
    creado_en: new Date("2025-10-01T08:00:00Z"),
    actualizado_en: new Date("2026-02-01T10:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000000005",
    razon_social: "Telecel S.A. (Tigo Bolivia)",
    nit: "1020112025",
    estado: "activo",
    contactos: [
        {
            "nombre": "Ing. Juan Pablo Calvo",
            "email": "jcalvo@tigo.com.bo",
            "telefono": "+591 3 3888000",
            "rol": "Director B2C & Fibra"
        },
        {
            "nombre": "Lic. Natalia Torrez Peinado",
            "email": "ntorrez@tigo.net.bo",
            "telefono": "+591 77300001",
            "rol": "Especialista de Marca y Pauta"
        }
    ],
    linea_credito: {
      limite: NumberDecimal("900000.00"),
      usado: NumberDecimal("370000.00"),
      moneda: "BOB"
    },
    version: 1,
    creado_en: new Date("2025-10-01T08:00:00Z"),
    actualizado_en: new Date("2026-02-01T10:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000000006",
    razon_social: "Embotelladoras Bolivianas Unidas S.A. (EMBOL)",
    nit: "1020224023",
    estado: "activo",
    contactos: [
        {
            "nombre": "Lic. Sergio Mauricio Daza",
            "email": "sdaza@embol.com.bo",
            "telefono": "+591 3 3535000",
            "rol": "Marketing Manager Coca-Cola"
        },
        {
            "nombre": "Lic. Jimena Cuéllar Roca",
            "email": "jcuellar@embol.com.bo",
            "telefono": "+591 78044556",
            "rol": "Supervisora de Activaciones"
        }
    ],
    linea_credito: {
      limite: NumberDecimal("800000.00"),
      usado: NumberDecimal("210000.00"),
      moneda: "BOB"
    },
    version: 1,
    creado_en: new Date("2025-10-01T08:00:00Z"),
    actualizado_en: new Date("2026-02-01T10:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000000007",
    razon_social: "Hipermaxi S.A.",
    nit: "1017325026",
    estado: "activo",
    contactos: [
        {
            "nombre": "Lic. Bernardo Tomelic Durán",
            "email": "btomelic@hipermaxi.com",
            "telefono": "+591 3 3418000",
            "rol": "Gerente Nacional de Marketing"
        },
        {
            "nombre": "Lic. Sandra Antelo Menacho",
            "email": "santelo@hipermaxi.com",
            "telefono": "+591 72133445",
            "rol": "Encargada de Promociones y Prensa"
        }
    ],
    linea_credito: {
      limite: NumberDecimal("500000.00"),
      usado: NumberDecimal("160000.00"),
      moneda: "BOB"
    },
    version: 1,
    creado_en: new Date("2025-10-01T08:00:00Z"),
    actualizado_en: new Date("2026-02-01T10:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000000008",
    razon_social: "Boliviana de Aviación (BoA)",
    nit: "154362025",
    estado: "activo",
    contactos: [
        {
            "nombre": "Lic. Ronald Salvatierra Flores",
            "email": "rsalvatierra@boa.bo",
            "telefono": "+591 4 4166000",
            "rol": "Gerente Comercial BoA"
        },
        {
            "nombre": "Lic. Patricia Beltrán Arce",
            "email": "pbeltran@boa.bo",
            "telefono": "+591 71755667",
            "rol": "Coordinadora de Comunicaciones"
        }
    ],
    linea_credito: {
      limite: NumberDecimal("600000.00"),
      usado: NumberDecimal("145000.00"),
      moneda: "BOB"
    },
    version: 1,
    creado_en: new Date("2025-10-01T08:00:00Z"),
    actualizado_en: new Date("2026-02-01T10:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000000009",
    razon_social: "Droguería INTI S.A.",
    nit: "1020339027",
    estado: "activo",
    contactos: [
        {
            "nombre": "Lic. Gonzalo Muñoz-Reyes",
            "email": "gmunozreyes@inti.com.bo",
            "telefono": "+591 2 2224000",
            "rol": "Director de Unidad Mentisan"
        },
        {
            "nombre": "Lic. Gabriela Moreno Pinto",
            "email": "gmoreno@inti.com.bo",
            "telefono": "+591 76299887",
            "rol": "Jefa de Producto OTC"
        }
    ],
    linea_credito: {
      limite: NumberDecimal("350000.00"),
      usado: NumberDecimal("0.00"),
      moneda: "BOB"
    },
    version: 1,
    creado_en: new Date("2025-10-01T08:00:00Z"),
    actualizado_en: new Date("2026-02-01T10:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000000010",
    razon_social: "Imcruz Comercial S.A. (Suzuki)",
    nit: "1020548022",
    estado: "moroso",
    contactos: [
        {
            "nombre": "Lic. Pablo Daniel Kuncar",
            "email": "pkuncar@imcruz.com.bo",
            "telefono": "+591 3 3156000",
            "rol": "Gerente Automotriz Suzuki"
        },
        {
            "nombre": "Lic. Laura Velasco Taborga",
            "email": "lvelasco@imcruz.com.bo",
            "telefono": "+591 77622334",
            "rol": "Jefa de Campañas y PR"
        }
    ],
    linea_credito: {
      limite: NumberDecimal("450000.00"),
      usado: NumberDecimal("0.00"),
      moneda: "BOB"
    },
    version: 1,
    creado_en: new Date("2025-10-01T08:00:00Z"),
    actualizado_en: new Date("2026-02-01T10:00:00Z")
  }
]);

// 3. INSERCION DE 14 CONTRATOS (IDs: a001 a a014)
dbc.contratos.insertMany([
  {
    id: "00000000-0000-0000-0000-00000000a001",
    cliente_id: "00000000-0000-0000-0000-000000000001",
    estado: "vigente",
    fecha_inicio: new Date("2026-01-01T00:00:00Z"),
    fecha_fin: new Date("2026-12-31T23:59:59Z"),
    monto: NumberDecimal("450000.00"),
    moneda: "BOB",
    creado_en: new Date("2026-01-01T00:00:00Z"),
    actualizado_en: new Date("2026-01-01T00:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000a002",
    cliente_id: "00000000-0000-0000-0000-000000000001",
    estado: "vencido",
    fecha_inicio: new Date("2025-01-01T00:00:00Z"),
    fecha_fin: new Date("2025-12-31T23:59:59Z"),
    monto: NumberDecimal("380000.00"),
    moneda: "BOB",
    creado_en: new Date("2025-01-01T00:00:00Z"),
    actualizado_en: new Date("2025-01-01T00:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000a003",
    cliente_id: "00000000-0000-0000-0000-000000000002",
    estado: "vigente",
    fecha_inicio: new Date("2026-01-01T00:00:00Z"),
    fecha_fin: new Date("2026-12-31T23:59:59Z"),
    monto: NumberDecimal("1200000.00"),
    moneda: "BOB",
    creado_en: new Date("2026-01-01T00:00:00Z"),
    actualizado_en: new Date("2026-01-01T00:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000a004",
    cliente_id: "00000000-0000-0000-0000-000000000002",
    estado: "vencido",
    fecha_inicio: new Date("2025-01-01T00:00:00Z"),
    fecha_fin: new Date("2025-12-31T23:59:59Z"),
    monto: NumberDecimal("950000.00"),
    moneda: "BOB",
    creado_en: new Date("2025-01-01T00:00:00Z"),
    actualizado_en: new Date("2025-01-01T00:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000a005",
    cliente_id: "00000000-0000-0000-0000-000000000003",
    estado: "vigente",
    fecha_inicio: new Date("2026-01-15T00:00:00Z"),
    fecha_fin: new Date("2026-12-15T23:59:59Z"),
    monto: NumberDecimal("350000.00"),
    moneda: "BOB",
    creado_en: new Date("2026-01-15T00:00:00Z"),
    actualizado_en: new Date("2026-01-15T00:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000a006",
    cliente_id: "00000000-0000-0000-0000-000000000004",
    estado: "vigente",
    fecha_inicio: new Date("2026-02-01T00:00:00Z"),
    fecha_fin: new Date("2027-01-31T23:59:59Z"),
    monto: NumberDecimal("280000.00"),
    moneda: "BOB",
    creado_en: new Date("2026-02-01T00:00:00Z"),
    actualizado_en: new Date("2026-02-01T00:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000a007",
    cliente_id: "00000000-0000-0000-0000-000000000005",
    estado: "vigente",
    fecha_inicio: new Date("2026-01-01T00:00:00Z"),
    fecha_fin: new Date("2026-12-31T23:59:59Z"),
    monto: NumberDecimal("850000.00"),
    moneda: "BOB",
    creado_en: new Date("2026-01-01T00:00:00Z"),
    actualizado_en: new Date("2026-01-01T00:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000a008",
    cliente_id: "00000000-0000-0000-0000-000000000005",
    estado: "vencido",
    fecha_inicio: new Date("2025-01-01T00:00:00Z"),
    fecha_fin: new Date("2025-12-31T23:59:59Z"),
    monto: NumberDecimal("720000.00"),
    moneda: "BOB",
    creado_en: new Date("2025-01-01T00:00:00Z"),
    actualizado_en: new Date("2025-01-01T00:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000a009",
    cliente_id: "00000000-0000-0000-0000-000000000006",
    estado: "vigente",
    fecha_inicio: new Date("2025-11-01T00:00:00Z"),
    fecha_fin: new Date("2026-10-31T23:59:59Z"),
    monto: NumberDecimal("750000.00"),
    moneda: "BOB",
    creado_en: new Date("2025-11-01T00:00:00Z"),
    actualizado_en: new Date("2025-11-01T00:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000a010",
    cliente_id: "00000000-0000-0000-0000-000000000007",
    estado: "vigente",
    fecha_inicio: new Date("2026-01-01T00:00:00Z"),
    fecha_fin: new Date("2026-12-31T23:59:59Z"),
    monto: NumberDecimal("480000.00"),
    moneda: "BOB",
    creado_en: new Date("2026-01-01T00:00:00Z"),
    actualizado_en: new Date("2026-01-01T00:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000a011",
    cliente_id: "00000000-0000-0000-0000-000000000008",
    estado: "vigente",
    fecha_inicio: new Date("2026-02-15T00:00:00Z"),
    fecha_fin: new Date("2026-11-30T23:59:59Z"),
    monto: NumberDecimal("550000.00"),
    moneda: "BOB",
    creado_en: new Date("2026-02-15T00:00:00Z"),
    actualizado_en: new Date("2026-02-15T00:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000a012",
    cliente_id: "00000000-0000-0000-0000-000000000009",
    estado: "vigente",
    fecha_inicio: new Date("2026-04-01T00:00:00Z"),
    fecha_fin: new Date("2026-12-31T23:59:59Z"),
    monto: NumberDecimal("300000.00"),
    moneda: "BOB",
    creado_en: new Date("2026-04-01T00:00:00Z"),
    actualizado_en: new Date("2026-04-01T00:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000a013",
    cliente_id: "00000000-0000-0000-0000-000000000010",
    estado: "vencido",
    fecha_inicio: new Date("2025-06-01T00:00:00Z"),
    fecha_fin: new Date("2026-03-31T23:59:59Z"),
    monto: NumberDecimal("400000.00"),
    moneda: "BOB",
    creado_en: new Date("2025-06-01T00:00:00Z"),
    actualizado_en: new Date("2025-06-01T00:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000a014",
    cliente_id: "00000000-0000-0000-0000-000000000010",
    estado: "rescindido",
    fecha_inicio: new Date("2026-01-01T00:00:00Z"),
    fecha_fin: new Date("2026-06-30T23:59:59Z"),
    monto: NumberDecimal("200000.00"),
    moneda: "BOB",
    creado_en: new Date("2026-01-01T00:00:00Z"),
    actualizado_en: new Date("2026-01-01T00:00:00Z")
  }
]);

// 4. INSERCION DE RESERVAS DE CREDITO SAGA (IDs: ce01 a ce03)
dbc.reservas_credito.insertMany([
  {
    id: "00000000-0000-0000-0000-00000000ce01",
    cliente_id: "00000000-0000-0000-0000-000000000001",
    campana_id: "00000000-0000-0000-0000-00000000c001",
    saga_id: "00000000-0000-0000-0000-000000005a01",
    monto: NumberDecimal("185000.00"),
    moneda: "BOB",
    estado: "consumido",
    creado_en: new Date("2026-02-01T12:00:00Z"),
    actualizado_en: new Date("2026-02-01T12:05:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000ce02",
    cliente_id: "00000000-0000-0000-0000-000000000002",
    campana_id: "00000000-0000-0000-0000-00000000c003",
    saga_id: "00000000-0000-0000-0000-000000005a02",
    monto: NumberDecimal("340000.00"),
    moneda: "BOB",
    estado: "reservado",
    creado_en: new Date("2026-02-01T12:00:00Z"),
    actualizado_en: new Date("2026-02-01T12:05:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000ce03",
    cliente_id: "00000000-0000-0000-0000-000000000010",
    campana_id: "00000000-0000-0000-0000-00000000c015",
    saga_id: "00000000-0000-0000-0000-000000005a03",
    monto: NumberDecimal("120000.00"),
    moneda: "BOB",
    estado: "liberado",
    creado_en: new Date("2026-02-01T12:00:00Z"),
    actualizado_en: new Date("2026-02-01T12:05:00Z")
  }
]);

// 5. BANDEJA DE SALIDA (Outbox Transaccional CRM)
dbc.bandeja_salida_eventos.insertMany([
  {
    id: "00000000-0000-0000-0000-00000000e101",
    tipo_agregado: "Cliente",
    agregado_id: "00000000-0000-0000-0000-000000000001",
    tipo_evento: "CreditoReservado",
    carga: {
      reserva_id: "00000000-0000-0000-0000-00000000ce01",
      cliente_id: "00000000-0000-0000-0000-000000000001",
      campana_id: "00000000-0000-0000-0000-00000000c001",
      monto: 185000.00,
      moneda: "BOB"
    },
    publicado: true,
    creado_en: new Date("2026-02-01T12:01:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000e102",
    tipo_agregado: "Cliente",
    agregado_id: "00000000-0000-0000-0000-000000000002",
    tipo_evento: "CreditoReservado",
    carga: {
      reserva_id: "00000000-0000-0000-0000-00000000ce02",
      cliente_id: "00000000-0000-0000-0000-000000000002",
      campana_id: "00000000-0000-0000-0000-00000000c003",
      monto: 340000.00,
      moneda: "BOB"
    },
    publicado: true,
    creado_en: new Date("2026-02-10T09:15:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000e103",
    tipo_agregado: "Cliente",
    agregado_id: "00000000-0000-0000-0000-000000000010",
    tipo_evento: "CreditoLiberado",
    carga: {
      reserva_id: "00000000-0000-0000-0000-00000000ce03",
      cliente_id: "00000000-0000-0000-0000-000000000010",
      campana_id: "00000000-0000-0000-0000-00000000c015",
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
    respuesta: { reserva_id: "00000000-0000-0000-0000-00000000ce01", estado: "reservado" },
    creado_en: new Date("2026-02-01T12:01:00Z"),
    vence_en: new Date("2026-03-01T12:01:00Z")
  },
  {
    clave: "5a02:2:accion",
    huella_solicitud: "e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3",
    estado: "COMPLETADO",
    codigo_estado: 200,
    respuesta: { reserva_id: "00000000-0000-0000-0000-00000000ce02", estado: "reservado" },
    creado_en: new Date("2026-02-10T09:15:00Z"),
    vence_en: new Date("2026-03-10T09:15:00Z")
  },
  {
    clave: "5a03:2:comp",
    huella_solicitud: "d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4",
    estado: "COMPLETADO",
    codigo_estado: 200,
    respuesta: { reserva_id: "00000000-0000-0000-0000-00000000ce03", estado: "liberado" },
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

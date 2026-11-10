// ============================================================================
// Semillas Completas AdOrbit | MongoDB Atlas (ms-creatividades)
// DB: adorbit_creatividades
// Total: 20 Briefs, 33 Piezas Creativas, 15 Auditorías de Marca, Outbox e Idempotencia
// IDs cortos: Briefs (..bf01 a ..bf20), Piezas (..1001 a ..1033)
// ============================================================================

const dbc = db.getSiblingDB("adorbit_creatividades");

// 0. Creacion segura de colecciones e indices con sus esquemas si no existen
const existingCols = dbc.getCollectionNames();
const uuid = { bsonType: "string", pattern: "^[0-9a-fA-F-]{36}$" };

if (!existingCols.includes("briefs")) {
  dbc.createCollection("briefs", { validator: { $jsonSchema: {
    bsonType: "object",
    required: ["id", "campana_id", "titulo", "estado", "creado_en"],
    properties: {
      id: uuid, campana_id: uuid, cliente_id: uuid,
      titulo: { bsonType: "string" },
      descripcion: { bsonType: "string" },
      estado: { enum: ["recibido", "en_creacion", "en_revision", "aprobado", "rechazado"] },
      version: { bsonType: "number" },
      creado_en: { bsonType: "date" }, actualizado_en: { bsonType: "date" }
    }
  }}});
  dbc.briefs.createIndex({ id: 1 }, { unique: true });
  dbc.briefs.createIndex({ campana_id: 1, estado: 1 });
}

if (!existingCols.includes("piezas")) {
  dbc.createCollection("piezas", { validator: { $jsonSchema: {
    bsonType: "object",
    required: ["id", "brief_id", "version_numero", "estado", "creado_en"],
    properties: {
      id: uuid, brief_id: uuid, campana_id: uuid,
      nombre: { bsonType: "string" },
      tipo: { enum: ["imagen", "video", "copy", "audio"] },
      version_numero: { bsonType: "number", minimum: 1 },
      archivo: { bsonType: "object", properties: {
        ruta: { bsonType: "string" }, mime: { bsonType: "string" }, tamano: { bsonType: "number" } } },
      estado: { enum: ["en_revision", "aprobada", "bloqueada_saga", "rechazada"] },
      estado_previo: { enum: ["en_revision", "aprobada", "rechazada", null] },
      bloqueo_saga: { bsonType: ["object", "null"],
        required: ["saga_id", "campana_id", "bloqueado_at", "expira_at"],
        properties: {
          saga_id: uuid, campana_id: uuid,
          bloqueado_at: { bsonType: "date" }, expira_at: { bsonType: "date" } } },
      validaciones_marca: { bsonType: "object", properties: {
        manual_marca_ok: { bsonType: "bool" }, detalles: { bsonType: "object" },
        validado_at: { bsonType: "date" } } },
      version: { bsonType: "number" },
      creado_en: { bsonType: "date" }, actualizado_en: { bsonType: "date" }
    }
  }}, validationLevel: "moderate" });
  dbc.piezas.createIndex({ id: 1 }, { unique: true });
  dbc.piezas.createIndex({ brief_id: 1, version_numero: 1 }, { unique: true });
  dbc.piezas.createIndex({ campana_id: 1, estado: 1 });
  dbc.piezas.createIndex({ "bloqueo_saga.saga_id": 1 }, { partialFilterExpression: { estado: "bloqueada_saga" } });
  dbc.piezas.createIndex({ "bloqueo_saga.expira_at": 1 }, { partialFilterExpression: { estado: "bloqueada_saga" } });
}

if (!existingCols.includes("validaciones_auditoria")) {
  dbc.createCollection("validaciones_auditoria", { validator: { $jsonSchema: {
    bsonType: "object",
    required: ["pieza_id", "resultado", "creado_en"],
    properties: {
      pieza_id: uuid,
      resultado: { enum: ["ok", "observada", "rechazada"] },
      origen: { enum: ["manual", "ia"] },
      usuario: { bsonType: "string" },
      detalles: { bsonType: "object" },
      creado_en: { bsonType: "date" }
    }
  }}});
  dbc.validaciones_auditoria.createIndex({ pieza_id: 1, creado_en: -1 });
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
dbc.validaciones_auditoria.deleteMany({});
dbc.piezas.deleteMany({});
dbc.briefs.deleteMany({});
dbc.bandeja_salida_eventos.deleteMany({});
dbc.claves_idempotencia.deleteMany({});

// 2. INSERCION DE 20 BRIEFS (IDs: bf01 a bf20)
dbc.briefs.insertMany([
  {
    id: "00000000-0000-0000-0000-00000000bf01",
    campana_id: "00000000-0000-0000-0000-00000000c001",
    cliente_id: "00000000-0000-0000-0000-000000000001",
    titulo: "Campaña Audiovisual Cuenta Joven BMSC 2026",
    descripcion: "Spots dinámicos para televisión y streaming dirigidos a jóvenes universitarios destacando pagos QR y tarjeta sin costo.",
    estado: "aprobado",
    version: 1,
    creado_en: new Date("2026-01-15T09:00:00Z"),
    actualizado_en: new Date("2026-01-20T14:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000bf02",
    campana_id: "00000000-0000-0000-0000-00000000c001",
    cliente_id: "00000000-0000-0000-0000-000000000001",
    titulo: "Key Visual y Banners Redes Cuenta Joven",
    descripcion: "Adaptaciones en 1080x1080 y 1080x1920 para Instagram, TikTok y Meta Ads con tipografía moderna y vibrante.",
    estado: "aprobado",
    version: 1,
    creado_en: new Date("2026-01-15T09:00:00Z"),
    actualizado_en: new Date("2026-01-20T14:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000bf03",
    campana_id: "00000000-0000-0000-0000-00000000c002",
    cliente_id: "00000000-0000-0000-0000-000000000001",
    titulo: "Prensa y Vallas Vivienda Social BMSC",
    descripcion: "Artes de alta resolución para periódicos y carteleras urbanas con la tasa regulada del 5.5% para primera vivienda.",
    estado: "aprobado",
    version: 1,
    creado_en: new Date("2026-01-15T09:00:00Z"),
    actualizado_en: new Date("2026-01-20T14:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000bf04",
    campana_id: "00000000-0000-0000-0000-00000000c003",
    cliente_id: "00000000-0000-0000-0000-000000000002",
    titulo: "Spot Épico Carnaval Paceña 2026",
    descripcion: "Pieza audiovisual de 45 segundos celebrando la hermandad y tradiciones carnavaleras en Santa Cruz, Oruro y Cochabamba.",
    estado: "aprobado",
    version: 1,
    creado_en: new Date("2026-01-15T09:00:00Z"),
    actualizado_en: new Date("2026-01-20T14:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000bf05",
    campana_id: "00000000-0000-0000-0000-00000000c003",
    cliente_id: "00000000-0000-0000-0000-000000000002",
    titulo: "Circuito de Vallas y Escenarios BTL Paceña",
    descripcion: "Desarrollo visual para pórticos del Cambódromo, vallas LED gigantes y uniformes de comparsas.",
    estado: "aprobado",
    version: 1,
    creado_en: new Date("2026-01-15T09:00:00Z"),
    actualizado_en: new Date("2026-01-20T14:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000bf06",
    campana_id: "00000000-0000-0000-0000-00000000c004",
    cliente_id: "00000000-0000-0000-0000-000000000002",
    titulo: "Serie Documental Huari Orígenes",
    descripcion: "Mini-cápsulas digitales de chefs bolivianos fusionando ingredientes nativos con cerveza Huari Tradicional y Miel.",
    estado: "aprobado",
    version: 1,
    creado_en: new Date("2026-01-15T09:00:00Z"),
    actualizado_en: new Date("2026-01-20T14:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000bf07",
    campana_id: "00000000-0000-0000-0000-00000000c005",
    cliente_id: "00000000-0000-0000-0000-000000000003",
    titulo: "Vuelta a Clases Sofía: Gráfica de Supermercados",
    descripcion: "Cenefas, rompetráficos y afiches para friales y góndolas destacando embutidos nutritivos para loncheras escolares.",
    estado: "aprobado",
    version: 1,
    creado_en: new Date("2026-01-15T09:00:00Z"),
    actualizado_en: new Date("2026-01-20T14:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000bf08",
    campana_id: "00000000-0000-0000-0000-00000000c006",
    cliente_id: "00000000-0000-0000-0000-000000000003",
    titulo: "San Juan Parrillero Sofía: Campaña Digital",
    descripcion: "Piezas interactivas de recetas de asado, parrilla criolla y promociones de chorizos para la noche de San Juan.",
    estado: "en_creacion",
    version: 1,
    creado_en: new Date("2026-01-15T09:00:00Z"),
    actualizado_en: new Date("2026-01-20T14:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000bf09",
    campana_id: "00000000-0000-0000-0000-00000000c007",
    cliente_id: "00000000-0000-0000-0000-000000000004",
    titulo: "Campaña Antigripal Chávez: Afiches y Cuñas",
    descripcion: "Material informativo preventivo para las 120 sucursales y cuñas de radio de 20s con mensajes de salud familiar.",
    estado: "aprobado",
    version: 1,
    creado_en: new Date("2026-01-15T09:00:00Z"),
    actualizado_en: new Date("2026-01-20T14:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000bf10",
    campana_id: "00000000-0000-0000-0000-00000000c008",
    cliente_id: "00000000-0000-0000-0000-000000000004",
    titulo: "Especial Mamá Chávez: Catálogo Dermocosmética",
    descripcion: "Catálogo impreso y digital de productos de belleza, cremas dermatológicas y descuentos por el Día de la Madre.",
    estado: "en_revision",
    version: 1,
    creado_en: new Date("2026-01-15T09:00:00Z"),
    actualizado_en: new Date("2026-01-20T14:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000bf11",
    campana_id: "00000000-0000-0000-0000-00000000c009",
    cliente_id: "00000000-0000-0000-0000-000000000005",
    titulo: "Master Spot TV Tigo Hogar Fibra 1000 Mbps",
    descripcion: "Spot cinematográfico demostrando latencia ultra baja para gaming y streaming simultáneo en el hogar.",
    estado: "aprobado",
    version: 1,
    creado_en: new Date("2026-01-15T09:00:00Z"),
    actualizado_en: new Date("2026-01-20T14:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000bf12",
    campana_id: "00000000-0000-0000-0000-00000000c009",
    cliente_id: "00000000-0000-0000-0000-000000000005",
    titulo: "Vallas y Cartelería Urbana Tigo Fibra",
    descripcion: "Gráficas de gran impacto en avenidas principales del eje troncal con la oferta de instalación gratuita.",
    estado: "aprobado",
    version: 1,
    creado_en: new Date("2026-01-15T09:00:00Z"),
    actualizado_en: new Date("2026-01-20T14:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000bf13",
    campana_id: "00000000-0000-0000-0000-00000000c010",
    cliente_id: "00000000-0000-0000-0000-000000000005",
    titulo: "Tutorial y Afiches Tigo Money QR Minoristas",
    descripcion: "Guía visual paso a paso para tenderos de barrio sobre cómo cobrar sin comisiones desde el teléfono.",
    estado: "aprobado",
    version: 1,
    creado_en: new Date("2026-01-15T09:00:00Z"),
    actualizado_en: new Date("2026-01-20T14:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000bf14",
    campana_id: "00000000-0000-0000-0000-00000000c011",
    cliente_id: "00000000-0000-0000-0000-000000000006",
    titulo: "Spot Coca-Cola Verano Sin Azúcar 2026",
    descripcion: "Comercial refrescante grabado en parques acuáticos y paisajes urbanos con jingle juvenil.",
    estado: "aprobado",
    version: 1,
    creado_en: new Date("2026-01-15T09:00:00Z"),
    actualizado_en: new Date("2026-01-20T14:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000bf15",
    campana_id: "00000000-0000-0000-0000-00000000c012",
    cliente_id: "00000000-0000-0000-0000-000000000007",
    titulo: "Gráfica Semanal Hipermaxi Miércoles Frescura",
    descripcion: "Plantillas automatizadas para redes y diarios con ofertas de frutas, verduras y carnes frescas.",
    estado: "aprobado",
    version: 1,
    creado_en: new Date("2026-01-15T09:00:00Z"),
    actualizado_en: new Date("2026-01-20T14:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000bf16",
    campana_id: "00000000-0000-0000-0000-00000000c013",
    cliente_id: "00000000-0000-0000-0000-000000000008",
    titulo: "Video Promocional BoA Vuelos Uyuni Directos",
    descripcion: "Video 4K de vistas aéreas del Salar de Uyuni comunicando frecuencias y tarifas promocionales.",
    estado: "aprobado",
    version: 1,
    creado_en: new Date("2026-01-15T09:00:00Z"),
    actualizado_en: new Date("2026-01-20T14:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000bf17",
    campana_id: "00000000-0000-0000-0000-00000000c014",
    cliente_id: "00000000-0000-0000-0000-000000000009",
    titulo: "Spot Bicentenario Mentisan 85 Años",
    descripcion: "Pieza emotiva e histórica con testimonios de familias de distintas regiones que confían en el ungüento verde.",
    estado: "en_revision",
    version: 1,
    creado_en: new Date("2026-01-15T09:00:00Z"),
    actualizado_en: new Date("2026-01-20T14:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000bf18",
    campana_id: "00000000-0000-0000-0000-00000000c014",
    cliente_id: "00000000-0000-0000-0000-000000000009",
    titulo: "Diseño Lata Conmemorativa Mentisan Vintage",
    descripcion: "Ilustración y empaque de edición limitada homenajeando el diseño clásico de 1941.",
    estado: "en_revision",
    version: 1,
    creado_en: new Date("2026-01-15T09:00:00Z"),
    actualizado_en: new Date("2026-01-20T14:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000bf19",
    campana_id: "00000000-0000-0000-0000-00000000c015",
    cliente_id: "00000000-0000-0000-0000-000000000010",
    titulo: "Lanzamiento Suzuki Swift Hybrid: Video Test Drive",
    descripcion: "Video demostrativo de eficiencia energética, consumo en ciudad y diseño del nuevo híbrido.",
    estado: "aprobado",
    version: 1,
    creado_en: new Date("2026-01-15T09:00:00Z"),
    actualizado_en: new Date("2026-01-20T14:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000bf20",
    campana_id: "00000000-0000-0000-0000-00000000c015",
    cliente_id: "00000000-0000-0000-0000-000000000010",
    titulo: "Valla Panorámica Suzuki Swift Hybrid",
    descripcion: "Artes gigantografías con especificaciones técnicas, precio base y financiamiento bancario.",
    estado: "rechazado",
    version: 1,
    creado_en: new Date("2026-01-15T09:00:00Z"),
    actualizado_en: new Date("2026-01-20T14:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000bf21",
    campana_id: "00000000-0000-0000-0000-00000000c016",
    cliente_id: "00000000-0000-0000-0000-000000000011",
    titulo: "Spot TV y Vallas Entel 5G Nacional",
    descripcion: "Campaña audiovisual de cobertura 5G en los 9 departamentos con identidad azul/naranja Entel.",
    estado: "aprobado",
    version: 1,
    creado_en: new Date("2026-01-15T09:00:00Z"),
    actualizado_en: new Date("2026-01-20T14:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000bf22",
    campana_id: "00000000-0000-0000-0000-00000000c017",
    cliente_id: "00000000-0000-0000-0000-000000000012",
    titulo: "Kit Digital BNB Créditos Vehiculares 24h",
    descripcion: "Banners animados y reels para aprobación vehicular inmediata desde BNB Móvil.",
    estado: "aprobado",
    version: 1,
    creado_en: new Date("2026-01-15T09:00:00Z"),
    actualizado_en: new Date("2026-01-20T14:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000bf23",
    campana_id: "00000000-0000-0000-0000-00000000c018",
    cliente_id: "00000000-0000-0000-0000-000000000013",
    titulo: "Comercial PIL Desayuno Campeón Escolar",
    descripcion: "Spot familiar de 30s y afiches para puntos de venta destacando línea láctea fortificada.",
    estado: "aprobado",
    version: 1,
    creado_en: new Date("2026-01-15T09:00:00Z"),
    actualizado_en: new Date("2026-01-20T14:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000bf24",
    campana_id: "00000000-0000-0000-0000-00000000c019",
    cliente_id: "00000000-0000-0000-0000-000000000014",
    titulo: "Gráfica Corporativa Banco Bisa PyME Impulsa",
    descripcion: "Artes para suplementos financieros y LinkedIn dirigidos al sector productivo.",
    estado: "aprobado",
    version: 1,
    creado_en: new Date("2026-01-15T09:00:00Z"),
    actualizado_en: new Date("2026-01-20T14:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000bf25",
    campana_id: "00000000-0000-0000-0000-00000000c020",
    cliente_id: "00000000-0000-0000-0000-000000000015",
    titulo: "Campaña Vía Pública Lubricantes YPFB Extravida",
    descripcion: "Vallas camineras y cuñas radiales para rutas troncales del país.",
    estado: "aprobado",
    version: 1,
    creado_en: new Date("2026-01-15T09:00:00Z"),
    actualizado_en: new Date("2026-01-20T14:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000bf26",
    campana_id: "00000000-0000-0000-0000-00000000c023",
    cliente_id: "00000000-0000-0000-0000-000000000018",
    titulo: "Cápsulas Recetario Aceite FINO Sabores de Casa",
    descripcion: "Videos cortos verticales con recetas tradicionales bolivianas.",
    estado: "en_revision",
    version: 1,
    creado_en: new Date("2026-01-15T09:00:00Z"),
    actualizado_en: new Date("2026-01-20T14:00:00Z")
  }
]);

// 3. INSERCION DE 33 PIEZAS CREATIVAS (IDs: 1001 a 1033)
dbc.piezas.insertMany([
  {
    id: "00000000-0000-0000-0000-000000001001",
    brief_id: "00000000-0000-0000-0000-00000000bf01",
    campana_id: "00000000-0000-0000-0000-00000000c001",
    nombre: "Master Spot TV 30s Cuenta Joven",
    tipo: "video",
    version_numero: 1,
    archivo: {
      ruta: "piezas-creatividades/bmsc/spot-cuenta-joven-30s.mp4",
      mime: "video/mp4",
      tamano: 45200000
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001002",
    brief_id: "00000000-0000-0000-0000-00000000bf01",
    campana_id: "00000000-0000-0000-0000-00000000c001",
    nombre: "Cutdown 15s TikTok Tu Plata Tu Ritmo",
    tipo: "video",
    version_numero: 2,
    archivo: {
      ruta: "piezas-creatividades/bmsc/tiktok-cuenta-joven-15s.mp4",
      mime: "video/mp4",
      tamano: 18400000
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001003",
    brief_id: "00000000-0000-0000-0000-00000000bf02",
    campana_id: "00000000-0000-0000-0000-00000000c001",
    nombre: "Post Feed 1080x1080 Beneficios Cuenta",
    tipo: "imagen",
    version_numero: 1,
    archivo: {
      ruta: "piezas-creatividades/bmsc/feed-beneficios.png",
      mime: "image/png",
      tamano: 3200000
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001004",
    brief_id: "00000000-0000-0000-0000-00000000bf02",
    campana_id: "00000000-0000-0000-0000-00000000c001",
    nombre: "Historia 1080x1920 Tarjeta Débito Neon",
    tipo: "imagen",
    version_numero: 2,
    archivo: {
      ruta: "piezas-creatividades/bmsc/historia-tarjeta.png",
      mime: "image/png",
      tamano: 4100000
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001005",
    brief_id: "00000000-0000-0000-0000-00000000bf03",
    campana_id: "00000000-0000-0000-0000-00000000c002",
    nombre: "Aviso Prensa Página Completa Tu Casa Propia",
    tipo: "imagen",
    version_numero: 1,
    archivo: {
      ruta: "piezas-creatividades/bmsc/prensa-vivienda-social.pdf",
      mime: "application/pdf",
      tamano: 12500000
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001006",
    brief_id: "00000000-0000-0000-0000-00000000bf04",
    campana_id: "00000000-0000-0000-0000-00000000c003",
    nombre: "Spot Master 45s Carnaval Paceña",
    tipo: "video",
    version_numero: 1,
    archivo: {
      ruta: "piezas-creatividades/pacena/spot-carnaval-45s.mp4",
      mime: "video/mp4",
      tamano: 68000000
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001007",
    brief_id: "00000000-0000-0000-0000-00000000bf04",
    campana_id: "00000000-0000-0000-0000-00000000c003",
    nombre: "Versión TV Abierta 30s Corsos",
    tipo: "video",
    version_numero: 2,
    archivo: {
      ruta: "piezas-creatividades/pacena/spot-tv-30s.mp4",
      mime: "video/mp4",
      tamano: 42000000
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001008",
    brief_id: "00000000-0000-0000-0000-00000000bf05",
    campana_id: "00000000-0000-0000-0000-00000000c003",
    nombre: "Valla Panorámica Cambódromo Santa Cruz",
    tipo: "imagen",
    version_numero: 1,
    archivo: {
      ruta: "piezas-creatividades/pacena/valla-cambodromo-12x4.tif",
      mime: "image/tiff",
      tamano: 85000000
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001009",
    brief_id: "00000000-0000-0000-0000-00000000bf05",
    campana_id: "00000000-0000-0000-0000-00000000c003",
    nombre: "Banner LED Frontal Entrada Oruro",
    tipo: "imagen",
    version_numero: 2,
    archivo: {
      ruta: "piezas-creatividades/pacena/led-oruro.png",
      mime: "image/png",
      tamano: 8900000
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001010",
    brief_id: "00000000-0000-0000-0000-00000000bf06",
    campana_id: "00000000-0000-0000-0000-00000000c004",
    nombre: "Cápsula Gastronómica 1: Trucha del Titicaca y Huari",
    tipo: "video",
    version_numero: 1,
    archivo: {
      ruta: "piezas-creatividades/huari/capsula-trucha.mp4",
      mime: "video/mp4",
      tamano: 34000000
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001011",
    brief_id: "00000000-0000-0000-0000-00000000bf06",
    campana_id: "00000000-0000-0000-0000-00000000c004",
    nombre: "Cápsula Gastronómica 2: Majadito de Pato y Huari Miel",
    tipo: "video",
    version_numero: 2,
    archivo: {
      ruta: "piezas-creatividades/huari/capsula-majadito.mp4",
      mime: "video/mp4",
      tamano: 31000000
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001012",
    brief_id: "00000000-0000-0000-0000-00000000bf07",
    campana_id: "00000000-0000-0000-0000-00000000c005",
    nombre: "Afiche Góndola Supermercado Loncheras",
    tipo: "imagen",
    version_numero: 1,
    archivo: {
      ruta: "piezas-creatividades/sofia/afiche-lonchera.jpg",
      mime: "image/jpeg",
      tamano: 5600000
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001013",
    brief_id: "00000000-0000-0000-0000-00000000bf07",
    campana_id: "00000000-0000-0000-0000-00000000c005",
    nombre: "Cuña Radial 20s Nutrición Rápida",
    tipo: "audio",
    version_numero: 2,
    archivo: {
      ruta: "piezas-creatividades/sofia/cuna-radio-20s.mp3",
      mime: "audio/mpeg",
      tamano: 1800000
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001014",
    brief_id: "00000000-0000-0000-0000-00000000bf08",
    campana_id: "00000000-0000-0000-0000-00000000c006",
    nombre: "Key Visual Parrillero San Juan (Borrador)",
    tipo: "imagen",
    version_numero: 1,
    archivo: {
      ruta: "piezas-creatividades/sofia/kv-sanjuan-draft.png",
      mime: "image/png",
      tamano: 7200000
    },
    estado: "en_revision",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: false,
      detalles: { paleta_colores: "inconsistente", logo_zona_segura: "violada", tipografia: "no autorizada" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001015",
    brief_id: "00000000-0000-0000-0000-00000000bf09",
    campana_id: "00000000-0000-0000-0000-00000000c007",
    nombre: "Display Fachada Sucursal Invierno Saludable",
    tipo: "imagen",
    version_numero: 1,
    archivo: {
      ruta: "piezas-creatividades/chavez/fachada-invierno.jpg",
      mime: "image/jpeg",
      tamano: 9200000
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001016",
    brief_id: "00000000-0000-0000-0000-00000000bf09",
    campana_id: "00000000-0000-0000-0000-00000000c007",
    nombre: "Cuña Radial 25s Consejos Antigripales",
    tipo: "audio",
    version_numero: 2,
    archivo: {
      ruta: "piezas-creatividades/chavez/cuna-antigripal.mp3",
      mime: "audio/mpeg",
      tamano: 2200000
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001017",
    brief_id: "00000000-0000-0000-0000-00000000bf10",
    campana_id: "00000000-0000-0000-0000-00000000c008",
    nombre: "Portada Catálogo Mamá Bella",
    tipo: "imagen",
    version_numero: 1,
    archivo: {
      ruta: "piezas-creatividades/chavez/portada-mama.jpg",
      mime: "image/jpeg",
      tamano: 6400000
    },
    estado: "en_revision",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001018",
    brief_id: "00000000-0000-0000-0000-00000000bf11",
    campana_id: "00000000-0000-0000-0000-00000000c009",
    nombre: "Spot TV Cine 40s Velocidad Absoluta",
    tipo: "video",
    version_numero: 1,
    archivo: {
      ruta: "piezas-creatividades/tigo/spot-fibra-1000.mp4",
      mime: "video/mp4",
      tamano: 58000000
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001019",
    brief_id: "00000000-0000-0000-0000-00000000bf11",
    campana_id: "00000000-0000-0000-0000-00000000c009",
    nombre: "Copy Institucional Radio y Prensa Tigo",
    tipo: "copy",
    version_numero: 2,
    archivo: {
      ruta: "piezas-creatividades/tigo/copy-planes-fibra.txt",
      mime: "text/plain",
      tamano: 8500
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001020",
    brief_id: "00000000-0000-0000-0000-00000000bf12",
    campana_id: "00000000-0000-0000-0000-00000000c009",
    nombre: "Valla Unipolar 4to Anillo Santa Cruz",
    tipo: "imagen",
    version_numero: 1,
    archivo: {
      ruta: "piezas-creatividades/tigo/valla-4to-anillo.png",
      mime: "image/png",
      tamano: 18500000
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001021",
    brief_id: "00000000-0000-0000-0000-00000000bf12",
    campana_id: "00000000-0000-0000-0000-00000000c009",
    nombre: "Valla Doble Faz Puente Cobija Cochabamba",
    tipo: "imagen",
    version_numero: 2,
    archivo: {
      ruta: "piezas-creatividades/tigo/valla-puente-cobija.png",
      mime: "image/png",
      tamano: 19200000
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001022",
    brief_id: "00000000-0000-0000-0000-00000000bf13",
    campana_id: "00000000-0000-0000-0000-00000000c010",
    nombre: "Sticker Adhesivo QR para Mesón de Venta",
    tipo: "imagen",
    version_numero: 1,
    archivo: {
      ruta: "piezas-creatividades/tigo/sticker-qr-tiendas.pdf",
      mime: "application/pdf",
      tamano: 3400000
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001023",
    brief_id: "00000000-0000-0000-0000-00000000bf14",
    campana_id: "00000000-0000-0000-0000-00000000c011",
    nombre: "Spot TV Magia de Verano 30s",
    tipo: "video",
    version_numero: 1,
    archivo: {
      ruta: "piezas-creatividades/cocacola/spot-verano-30s.mp4",
      mime: "video/mp4",
      tamano: 46000000
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001024",
    brief_id: "00000000-0000-0000-0000-00000000bf14",
    campana_id: "00000000-0000-0000-0000-00000000c011",
    nombre: "Valla Rutera Doble Vía La Guardia",
    tipo: "imagen",
    version_numero: 2,
    archivo: {
      ruta: "piezas-creatividades/cocacola/valla-laguardia.jpg",
      mime: "image/jpeg",
      tamano: 14200000
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001025",
    brief_id: "00000000-0000-0000-0000-00000000bf15",
    campana_id: "00000000-0000-0000-0000-00000000c012",
    nombre: "Aviso Diario El Deber 1/2 Página Ofertas",
    tipo: "imagen",
    version_numero: 1,
    archivo: {
      ruta: "piezas-creatividades/hipermaxi/prensa-frescura.pdf",
      mime: "application/pdf",
      tamano: 11000000
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001026",
    brief_id: "00000000-0000-0000-0000-00000000bf15",
    campana_id: "00000000-0000-0000-0000-00000000c012",
    nombre: "Carrusel Facebook 5 Slides Frutas y Carnes",
    tipo: "imagen",
    version_numero: 2,
    archivo: {
      ruta: "piezas-creatividades/hipermaxi/carrusel-fb.zip",
      mime: "application/zip",
      tamano: 8500000
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001027",
    brief_id: "00000000-0000-0000-0000-00000000bf16",
    campana_id: "00000000-0000-0000-0000-00000000c013",
    nombre: "Master Video 60s Salar de Uyuni Experiencia",
    tipo: "video",
    version_numero: 1,
    archivo: {
      ruta: "piezas-creatividades/boa/uyuni-60s-4k.mp4",
      mime: "video/mp4",
      tamano: 92000000
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001028",
    brief_id: "00000000-0000-0000-0000-00000000bf16",
    campana_id: "00000000-0000-0000-0000-00000000c013",
    nombre: "Banners Digitales Red Display Google",
    tipo: "imagen",
    version_numero: 2,
    archivo: {
      ruta: "piezas-creatividades/boa/display-banners.zip",
      mime: "application/zip",
      tamano: 4800000
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001029",
    brief_id: "00000000-0000-0000-0000-00000000bf17",
    campana_id: "00000000-0000-0000-0000-00000000c014",
    nombre: "Spot Emotivo Mentisan 85 Años (Corte Director)",
    tipo: "video",
    version_numero: 1,
    archivo: {
      ruta: "piezas-creatividades/inti/spot-85anios-rough.mp4",
      mime: "video/mp4",
      tamano: 75000000
    },
    estado: "en_revision",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: false,
      detalles: { paleta_colores: "inconsistente", logo_zona_segura: "violada", tipografia: "no autorizada" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001030",
    brief_id: "00000000-0000-0000-0000-00000000bf18",
    campana_id: "00000000-0000-0000-0000-00000000c014",
    nombre: "Diseño 3D Lata de Colección 1941",
    tipo: "imagen",
    version_numero: 1,
    archivo: {
      ruta: "piezas-creatividades/inti/render-lata-vintage.png",
      mime: "image/png",
      tamano: 15600000
    },
    estado: "en_revision",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001031",
    brief_id: "00000000-0000-0000-0000-00000000bf19",
    campana_id: "00000000-0000-0000-0000-00000000c015",
    nombre: "Video Showroom Suzuki Swift Hybrid",
    tipo: "video",
    version_numero: 1,
    archivo: {
      ruta: "piezas-creatividades/suzuki/testdrive-swift.mp4",
      mime: "video/mp4",
      tamano: 48000000
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001032",
    brief_id: "00000000-0000-0000-0000-00000000bf20",
    campana_id: "00000000-0000-0000-0000-00000000c015",
    nombre: "Valla Principal Cristo Redentor (Versión 1 Rechazada)",
    tipo: "imagen",
    version_numero: 1,
    archivo: {
      ruta: "piezas-creatividades/suzuki/valla-cristo-v1-rechazada.jpg",
      mime: "image/jpeg",
      tamano: 22000000
    },
    estado: "rechazada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: false,
      detalles: { paleta_colores: "inconsistente", logo_zona_segura: "violada", tipografia: "no autorizada" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001033",
    brief_id: "00000000-0000-0000-0000-00000000bf20",
    campana_id: "00000000-0000-0000-0000-00000000c015",
    nombre: "Valla Principal Cristo Redentor (Reintento Borrador)",
    tipo: "imagen",
    version_numero: 2,
    archivo: {
      ruta: "piezas-creatividades/suzuki/valla-cristo-v2-draft.jpg",
      mime: "image/jpeg",
      tamano: 23500000
    },
    estado: "en_revision",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: false,
      detalles: { paleta_colores: "inconsistente", logo_zona_segura: "violada", tipografia: "no autorizada" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001034",
    brief_id: "00000000-0000-0000-0000-00000000bf21",
    campana_id: "00000000-0000-0000-0000-00000000c016",
    nombre: "Spot Master Entel 5G Bolivia Conectada 45s",
    tipo: "video",
    version_numero: 1,
    archivo: {
      ruta: "piezas-creatividades/entel/spot-5g-nacional.mp4",
      mime: "video/mp4",
      tamano: 54000000
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001035",
    brief_id: "00000000-0000-0000-0000-00000000bf21",
    campana_id: "00000000-0000-0000-0000-00000000c016",
    nombre: "Valla Autopista La Paz - El Alto Entel 5G",
    tipo: "imagen",
    version_numero: 2,
    archivo: {
      ruta: "piezas-creatividades/entel/valla-autopista-5g.png",
      mime: "image/png",
      tamano: 16400000
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001036",
    brief_id: "00000000-0000-0000-0000-00000000bf22",
    campana_id: "00000000-0000-0000-0000-00000000c017",
    nombre: "Reel Instagram BNB Crédito Vehicular 24h",
    tipo: "video",
    version_numero: 1,
    archivo: {
      ruta: "piezas-creatividades/bnb/reel-vehicular-24h.mp4",
      mime: "video/mp4",
      tamano: 21000000
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001037",
    brief_id: "00000000-0000-0000-0000-00000000bf23",
    campana_id: "00000000-0000-0000-0000-00000000c018",
    nombre: "Spot TV PIL Desayuno Campeón 30s",
    tipo: "video",
    version_numero: 1,
    archivo: {
      ruta: "piezas-creatividades/pil/spot-desayuno-campeon.mp4",
      mime: "video/mp4",
      tamano: 39000000
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001038",
    brief_id: "00000000-0000-0000-0000-00000000bf24",
    campana_id: "00000000-0000-0000-0000-00000000c019",
    nombre: "Arte Prensa Financiera Banco Bisa PyME",
    tipo: "imagen",
    version_numero: 1,
    archivo: {
      ruta: "piezas-creatividades/bisa/prensa-pyme-impulsa.pdf",
      mime: "application/pdf",
      tamano: 9800000
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001039",
    brief_id: "00000000-0000-0000-0000-00000000bf25",
    campana_id: "00000000-0000-0000-0000-00000000c020",
    nombre: "Valla Caminera YPFB Extravida XV500",
    tipo: "imagen",
    version_numero: 1,
    archivo: {
      ruta: "piezas-creatividades/ypfb/valla-extravida-xv500.jpg",
      mime: "image/jpeg",
      tamano: 18200000
    },
    estado: "aprobada",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  },
  {
    id: "00000000-0000-0000-0000-000000001040",
    brief_id: "00000000-0000-0000-0000-00000000bf26",
    campana_id: "00000000-0000-0000-0000-00000000c023",
    nombre: "Cápsula Receta Salteñas con Aceite FINO",
    tipo: "video",
    version_numero: 1,
    archivo: {
      ruta: "piezas-creatividades/fino/capsula-receta-1.mp4",
      mime: "video/mp4",
      tamano: 27500000
    },
    estado: "en_revision",
    estado_previo: null,
    bloqueo_saga: null,
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  }
]);

// 4. INSERCION DE AUDITORIAS DE VALIDACION DE MARCA (MANUAL Y POR IA)
dbc.validaciones_auditoria.insertMany([
  {
    pieza_id: "00000000-0000-0000-0000-000000001001",
    resultado: "ok",
    origen: "ia",
    usuario: "agente_vision_ia",
    detalles: { confianza: 0.98, paleta: "RGB oficial BMSC verde/dorado", logo_detectado: true },
    creado_en: new Date("2026-01-22T08:30:00Z")
  },
  {
    pieza_id: "00000000-0000-0000-0000-000000001001",
    resultado: "ok",
    origen: "manual",
    usuario: "supervisor.creativo@adorbit.bo",
    detalles: { comentario: "Aprobado para TV nacional y streaming digital." },
    creado_en: new Date("2026-01-22T10:00:00Z")
  },
  {
    pieza_id: "00000000-0000-0000-0000-000000001006",
    resultado: "ok",
    origen: "ia",
    usuario: "agente_vision_ia",
    detalles: { confianza: 0.99, paleta: "Rojo/Blanco/Dorado Paceña", logo_ratio: "100% perfecto" },
    creado_en: new Date("2026-01-25T14:10:00Z")
  },
  {
    pieza_id: "00000000-0000-0000-0000-000000001006",
    resultado: "ok",
    origen: "manual",
    usuario: "director.arte@adorbit.bo",
    detalles: { comentario: "Excelente ritmo audiovisual, colores respetan el manual de marca." },
    creado_en: new Date("2026-01-25T16:00:00Z")
  },
  {
    pieza_id: "00000000-0000-0000-0000-000000001014",
    resultado: "observada",
    origen: "ia",
    usuario: "agente_vision_ia",
    detalles: { advertencia: "Texto 'San Juan' con contraste insuficiente sobre fondo de brasas" },
    creado_en: new Date("2026-02-01T09:00:00Z")
  },
  {
    pieza_id: "00000000-0000-0000-0000-000000001032",
    resultado: "rechazada",
    origen: "ia",
    usuario: "agente_vision_ia",
    detalles: { fallo: "Logo Suzuki deformado horizontalmente (+14% ratio) y tipografía de precio no autorizada" },
    creado_en: new Date("2026-01-10T11:00:00Z")
  },
  {
    pieza_id: "00000000-0000-0000-0000-000000001032",
    resultado: "rechazada",
    origen: "manual",
    usuario: "lead.marca@adorbit.bo",
    detalles: { motivo: "Rechazada. La pieza incumple la guía de marca de Imcruz/Suzuki. Provocó aborto de SAGA 5a03." },
    creado_en: new Date("2026-01-10T11:30:00Z")
  }
]);

// 5. BANDEJA DE SALIDA (Outbox Transaccional Creatividades)
dbc.bandeja_salida_eventos.insertMany([
  {
    id: "00000000-0000-0000-0000-00000000e201",
    tipo_agregado: "Pieza",
    agregado_id: "00000000-0000-0000-0000-000000001001",
    tipo_evento: "PiezaAprobada",
    carga: { pieza_id: "00000000-0000-0000-0000-000000001001", campana_id: "00000000-0000-0000-0000-00000000c001", tipo: "video" },
    publicado: true,
    creado_en: new Date("2026-01-22T10:05:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000e202",
    tipo_agregado: "Pieza",
    agregado_id: "00000000-0000-0000-0000-000000001006",
    tipo_evento: "PiezaAprobada",
    carga: { pieza_id: "00000000-0000-0000-0000-000000001006", campana_id: "00000000-0000-0000-0000-00000000c003", tipo: "video" },
    publicado: true,
    creado_en: new Date("2026-01-25T16:05:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000e203",
    tipo_agregado: "Pieza",
    agregado_id: "00000000-0000-0000-0000-000000001001",
    tipo_evento: "PiezasBloqueadas",
    carga: { saga_id: "00000000-0000-0000-0000-000000005a01", campana_id: "00000000-0000-0000-0000-00000000c001", total_piezas: 1 },
    publicado: true,
    creado_en: new Date("2026-02-01T12:02:00Z")
  },
  {
    id: "00000000-0000-0000-0000-00000000e204",
    tipo_agregado: "Pieza",
    agregado_id: "00000000-0000-0000-0000-000000001032",
    tipo_evento: "BloqueoFallido",
    carga: { saga_id: "00000000-0000-0000-0000-000000005a03", campana_id: "00000000-0000-0000-0000-00000000c015", motivo: "Pieza en estado rechazada no puede bloquearse" },
    publicado: true,
    creado_en: new Date("2026-01-10T14:28:00Z")
  }
]);

// 6. CLAVES DE IDEMPOTENCIA HISTORICAS (Comandos SAGA Paso 3)
dbc.claves_idempotencia.insertMany([
  {
    clave: "5a01:3:accion",
    huella_solicitud: "a3b4c5d6e7f8a3b4c5d6e7f8a3b4c5d6e7f8a3b4c5d6e7f8a3b4c5d6e7f8a3b4",
    estado: "COMPLETADO",
    codigo_estado: 200,
    respuesta: { piezas_bloqueadas: ["00000000-0000-0000-0000-000000001001", "00000000-0000-0000-0000-000000001002"], estado: "bloqueadas" },
    creado_en: new Date("2026-02-01T12:02:00Z"),
    vence_en: new Date("2026-03-01T12:02:00Z")
  },
  {
    clave: "5a03:3:accion",
    huella_solicitud: "b4c5d6e7f8a3b4c5d6e7f8a3b4c5d6e7f8a3b4c5d6e7f8a3b4c5d6e7f8a3b4c5",
    estado: "COMPLETADO",
    codigo_estado: 422,
    respuesta: { codigo: "PIEZA_NO_APROBADA", mensaje: "La pieza 1032 esta en estado rechazada" },
    creado_en: new Date("2026-01-10T14:28:00Z"),
    vence_en: new Date("2026-02-10T14:28:00Z")
  }
]);

print("====================================================================");
print("Semillas de ms-creatividades sembradas con exito en adorbit_creatividades!");
print("Briefs insertados: " + dbc.briefs.countDocuments());
print("Piezas creativas insertadas: " + dbc.piezas.countDocuments());
print("Auditorias de marca insertadas: " + dbc.validaciones_auditoria.countDocuments());
print("Eventos Outbox: " + dbc.bandeja_salida_eventos.countDocuments());
print("====================================================================");

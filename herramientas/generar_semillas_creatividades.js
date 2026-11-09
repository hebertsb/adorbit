const fs = require('fs');

const pad = (n, len = 2) => String(n).padStart(len, '0');
const cliId = (n) => '00000000-0000-0000-0000-0000000000' + pad(n);
const cId = (n) => '00000000-0000-0000-0000-00000000c' + String(n).padStart(3, '0');
const sId = (n) => '00000000-0000-0000-0000-000000005a' + pad(n);
const bfId = (n) => '00000000-0000-0000-0000-00000000bf' + pad(n);
const pzId = (n) => '00000000-0000-0000-0000-000000001' + String(n).padStart(3, '0');
const evtId = (n) => '00000000-0000-0000-0000-00000000e' + String(n).padStart(3, '0');

const briefs = [
  { n: 1, c: 1, cli: 1, tit: 'Campaña Audiovisual Cuenta Joven BMSC 2026', des: 'Spots dinámicos para televisión y streaming dirigidos a jóvenes universitarios destacando pagos QR y tarjeta sin costo.', est: 'aprobado' },
  { n: 2, c: 1, cli: 1, tit: 'Key Visual y Banners Redes Cuenta Joven', des: 'Adaptaciones en 1080x1080 y 1080x1920 para Instagram, TikTok y Meta Ads con tipografía moderna y vibrante.', est: 'aprobado' },
  { n: 3, c: 2, cli: 1, tit: 'Prensa y Vallas Vivienda Social BMSC', des: 'Artes de alta resolución para periódicos y carteleras urbanas con la tasa regulada del 5.5% para primera vivienda.', est: 'aprobado' },
  { n: 4, c: 3, cli: 2, tit: 'Spot Épico Carnaval Paceña 2026', des: 'Pieza audiovisual de 45 segundos celebrando la hermandad y tradiciones carnavaleras en Santa Cruz, Oruro y Cochabamba.', est: 'aprobado' },
  { n: 5, c: 3, cli: 2, tit: 'Circuito de Vallas y Escenarios BTL Paceña', des: 'Desarrollo visual para pórticos del Cambódromo, vallas LED gigantes y uniformes de comparsas.', est: 'aprobado' },
  { n: 6, c: 4, cli: 2, tit: 'Serie Documental Huari Orígenes', des: 'Mini-cápsulas digitales de chefs bolivianos fusionando ingredientes nativos con cerveza Huari Tradicional y Miel.', est: 'aprobado' },
  { n: 7, c: 5, cli: 3, tit: 'Vuelta a Clases Sofía: Gráfica de Supermercados', des: 'Cenefas, rompetráficos y afiches para friales y góndolas destacando embutidos nutritivos para loncheras escolares.', est: 'aprobado' },
  { n: 8, c: 6, cli: 3, tit: 'San Juan Parrillero Sofía: Campaña Digital', des: 'Piezas interactivas de recetas de asado, parrilla criolla y promociones de chorizos para la noche de San Juan.', est: 'en_creacion' },
  { n: 9, c: 7, cli: 4, tit: 'Campaña Antigripal Chávez: Afiches y Cuñas', des: 'Material informativo preventivo para las 120 sucursales y cuñas de radio de 20s con mensajes de salud familiar.', est: 'aprobado' },
  { n: 10, c: 8, cli: 4, tit: 'Especial Mamá Chávez: Catálogo Dermocosmética', des: 'Catálogo impreso y digital de productos de belleza, cremas dermatológicas y descuentos por el Día de la Madre.', est: 'en_revision' },
  { n: 11, c: 9, cli: 5, tit: 'Master Spot TV Tigo Hogar Fibra 1000 Mbps', des: 'Spot cinematográfico demostrando latencia ultra baja para gaming y streaming simultáneo en el hogar.', est: 'aprobado' },
  { n: 12, c: 9, cli: 5, tit: 'Vallas y Cartelería Urbana Tigo Fibra', des: 'Gráficas de gran impacto en avenidas principales del eje troncal con la oferta de instalación gratuita.', est: 'aprobado' },
  { n: 13, c: 10, cli: 5, tit: 'Tutorial y Afiches Tigo Money QR Minoristas', des: 'Guía visual paso a paso para tenderos de barrio sobre cómo cobrar sin comisiones desde el teléfono.', est: 'aprobado' },
  { n: 14, c: 11, cli: 6, tit: 'Spot Coca-Cola Verano Sin Azúcar 2026', des: 'Comercial refrescante grabado en parques acuáticos y paisajes urbanos con jingle juvenil.', est: 'aprobado' },
  { n: 15, c: 12, cli: 7, tit: 'Gráfica Semanal Hipermaxi Miércoles Frescura', des: 'Plantillas automatizadas para redes y diarios con ofertas de frutas, verduras y carnes frescas.', est: 'aprobado' },
  { n: 16, c: 13, cli: 8, tit: 'Video Promocional BoA Vuelos Uyuni Directos', des: 'Video 4K de vistas aéreas del Salar de Uyuni comunicando frecuencias y tarifas promocionales.', est: 'aprobado' },
  { n: 17, c: 14, cli: 9, tit: 'Spot Bicentenario Mentisan 85 Años', des: 'Pieza emotiva e histórica con testimonios de familias de distintas regiones que confían en el ungüento verde.', est: 'en_revision' },
  { n: 18, c: 14, cli: 9, tit: 'Diseño Lata Conmemorativa Mentisan Vintage', des: 'Ilustración y empaque de edición limitada homenajeando el diseño clásico de 1941.', est: 'en_revision' },
  { n: 19, c: 15, cli: 10, tit: 'Lanzamiento Suzuki Swift Hybrid: Video Test Drive', des: 'Video demostrativo de eficiencia energética, consumo en ciudad y diseño del nuevo híbrido.', est: 'aprobado' },
  { n: 20, c: 15, cli: 10, tit: 'Valla Panorámica Suzuki Swift Hybrid', des: 'Artes gigantografías con especificaciones técnicas, precio base y financiamiento bancario.', est: 'rechazado' }
];

const piezas = [
  // Brief 1: BMSC Spot Cuenta Joven
  { n: 1, bf: 1, c: 1, nom: 'Master Spot TV 30s Cuenta Joven', tipo: 'video', v: 1, est: 'aprobada', prev: null,
    arch: { ruta: 'piezas-creatividades/bmsc/spot-cuenta-joven-30s.mp4', mime: 'video/mp4', tamano: 45200000 },
    valOk: true, bloq: null },
  { n: 2, bf: 1, c: 1, nom: 'Cutdown 15s TikTok Tu Plata Tu Ritmo', tipo: 'video', v: 2, est: 'aprobada', prev: null,
    arch: { ruta: 'piezas-creatividades/bmsc/tiktok-cuenta-joven-15s.mp4', mime: 'video/mp4', tamano: 18400000 },
    valOk: true, bloq: null },

  // Brief 2: BMSC Key Visual Redes
  { n: 3, bf: 2, c: 1, nom: 'Post Feed 1080x1080 Beneficios Cuenta', tipo: 'imagen', v: 1, est: 'aprobada', prev: null,
    arch: { ruta: 'piezas-creatividades/bmsc/feed-beneficios.png', mime: 'image/png', tamano: 3200000 },
    valOk: true, bloq: null },
  { n: 4, bf: 2, c: 1, nom: 'Historia 1080x1920 Tarjeta Débito Neon', tipo: 'imagen', v: 2, est: 'aprobada', prev: null,
    arch: { ruta: 'piezas-creatividades/bmsc/historia-tarjeta.png', mime: 'image/png', tamano: 4100000 },
    valOk: true, bloq: null },

  // Brief 3: BMSC Vivienda Social
  { n: 5, bf: 3, c: 2, nom: 'Aviso Prensa Página Completa Tu Casa Propia', tipo: 'imagen', v: 1, est: 'aprobada', prev: null,
    arch: { ruta: 'piezas-creatividades/bmsc/prensa-vivienda-social.pdf', mime: 'application/pdf', tamano: 12500000 },
    valOk: true, bloq: null },

  // Brief 4: Paceña Spot Carnaval
  { n: 6, bf: 4, c: 3, nom: 'Spot Master 45s Carnaval Paceña', tipo: 'video', v: 1, est: 'aprobada', prev: null,
    arch: { ruta: 'piezas-creatividades/pacena/spot-carnaval-45s.mp4', mime: 'video/mp4', tamano: 68000000 },
    valOk: true, bloq: null },
  { n: 7, bf: 4, c: 3, nom: 'Versión TV Abierta 30s Corsos', tipo: 'video', v: 2, est: 'aprobada', prev: null,
    arch: { ruta: 'piezas-creatividades/pacena/spot-tv-30s.mp4', mime: 'video/mp4', tamano: 42000000 },
    valOk: true, bloq: null },

  // Brief 5: Paceña Vallas y BTL
  { n: 8, bf: 5, c: 3, nom: 'Valla Panorámica Cambódromo Santa Cruz', tipo: 'imagen', v: 1, est: 'aprobada', prev: null,
    arch: { ruta: 'piezas-creatividades/pacena/valla-cambodromo-12x4.tif', mime: 'image/tiff', tamano: 85000000 },
    valOk: true, bloq: null },
  { n: 9, bf: 5, c: 3, nom: 'Banner LED Frontal Entrada Oruro', tipo: 'imagen', v: 2, est: 'aprobada', prev: null,
    arch: { ruta: 'piezas-creatividades/pacena/led-oruro.png', mime: 'image/png', tamano: 8900000 },
    valOk: true, bloq: null },

  // Brief 6: Huari Orígenes
  { n: 10, bf: 6, c: 4, nom: 'Cápsula Gastronómica 1: Trucha del Titicaca y Huari', tipo: 'video', v: 1, est: 'aprobada', prev: null,
    arch: { ruta: 'piezas-creatividades/huari/capsula-trucha.mp4', mime: 'video/mp4', tamano: 34000000 },
    valOk: true, bloq: null },
  { n: 11, bf: 6, c: 4, nom: 'Cápsula Gastronómica 2: Majadito de Pato y Huari Miel', tipo: 'video', v: 2, est: 'aprobada', prev: null,
    arch: { ruta: 'piezas-creatividades/huari/capsula-majadito.mp4', mime: 'video/mp4', tamano: 31000000 },
    valOk: true, bloq: null },

  // Brief 7: Sofía Vuelta a Clases
  { n: 12, bf: 7, c: 5, nom: 'Afiche Góndola Supermercado Loncheras', tipo: 'imagen', v: 1, est: 'aprobada', prev: null,
    arch: { ruta: 'piezas-creatividades/sofia/afiche-lonchera.jpg', mime: 'image/jpeg', tamano: 5600000 },
    valOk: true, bloq: null },
  { n: 13, bf: 7, c: 5, nom: 'Cuña Radial 20s Nutrición Rápida', tipo: 'audio', v: 2, est: 'aprobada', prev: null,
    arch: { ruta: 'piezas-creatividades/sofia/cuna-radio-20s.mp3', mime: 'audio/mpeg', tamano: 1800000 },
    valOk: true, bloq: null },

  // Brief 8: Sofía San Juan
  { n: 14, bf: 8, c: 6, nom: 'Key Visual Parrillero San Juan (Borrador)', tipo: 'imagen', v: 1, est: 'en_revision', prev: null,
    arch: { ruta: 'piezas-creatividades/sofia/kv-sanjuan-draft.png', mime: 'image/png', tamano: 7200000 },
    valOk: false, bloq: null },

  // Brief 9: Farmacias Chávez Antigripal
  { n: 15, bf: 9, c: 7, nom: 'Display Fachada Sucursal Invierno Saludable', tipo: 'imagen', v: 1, est: 'aprobada', prev: null,
    arch: { ruta: 'piezas-creatividades/chavez/fachada-invierno.jpg', mime: 'image/jpeg', tamano: 9200000 },
    valOk: true, bloq: null },
  { n: 16, bf: 9, c: 7, nom: 'Cuña Radial 25s Consejos Antigripales', tipo: 'audio', v: 2, est: 'aprobada', prev: null,
    arch: { ruta: 'piezas-creatividades/chavez/cuna-antigripal.mp3', mime: 'audio/mpeg', tamano: 2200000 },
    valOk: true, bloq: null },

  // Brief 10: Farmacias Chávez Mamá
  { n: 17, bf: 10, c: 8, nom: 'Portada Catálogo Mamá Bella', tipo: 'imagen', v: 1, est: 'en_revision', prev: null,
    arch: { ruta: 'piezas-creatividades/chavez/portada-mama.jpg', mime: 'image/jpeg', tamano: 6400000 },
    valOk: true, bloq: null },

  // Brief 11: Tigo Hogar Fibra 1000 Mbps
  { n: 18, bf: 11, c: 9, nom: 'Spot TV Cine 40s Velocidad Absoluta', tipo: 'video', v: 1, est: 'aprobada', prev: null,
    arch: { ruta: 'piezas-creatividades/tigo/spot-fibra-1000.mp4', mime: 'video/mp4', tamano: 58000000 },
    valOk: true, bloq: null },
  { n: 19, bf: 11, c: 9, nom: 'Copy Institucional Radio y Prensa Tigo', tipo: 'copy', v: 2, est: 'aprobada', prev: null,
    arch: { ruta: 'piezas-creatividades/tigo/copy-planes-fibra.txt', mime: 'text/plain', tamano: 8500 },
    valOk: true, bloq: null },

  // Brief 12: Tigo Vallas Urbanas
  { n: 20, bf: 12, c: 9, nom: 'Valla Unipolar 4to Anillo Santa Cruz', tipo: 'imagen', v: 1, est: 'aprobada', prev: null,
    arch: { ruta: 'piezas-creatividades/tigo/valla-4to-anillo.png', mime: 'image/png', tamano: 18500000 },
    valOk: true, bloq: null },
  { n: 21, bf: 12, c: 9, nom: 'Valla Doble Faz Puente Cobija Cochabamba', tipo: 'imagen', v: 2, est: 'aprobada', prev: null,
    arch: { ruta: 'piezas-creatividades/tigo/valla-puente-cobija.png', mime: 'image/png', tamano: 19200000 },
    valOk: true, bloq: null },

  // Brief 13: Tigo Money Minoristas
  { n: 22, bf: 13, c: 10, nom: 'Sticker Adhesivo QR para Mesón de Venta', tipo: 'imagen', v: 1, est: 'aprobada', prev: null,
    arch: { ruta: 'piezas-creatividades/tigo/sticker-qr-tiendas.pdf', mime: 'application/pdf', tamano: 3400000 },
    valOk: true, bloq: null },

  // Brief 14: Coca-Cola Verano Sin Azúcar
  { n: 23, bf: 14, c: 11, nom: 'Spot TV Magia de Verano 30s', tipo: 'video', v: 1, est: 'aprobada', prev: null,
    arch: { ruta: 'piezas-creatividades/cocacola/spot-verano-30s.mp4', mime: 'video/mp4', tamano: 46000000 },
    valOk: true, bloq: null },
  { n: 24, bf: 14, c: 11, nom: 'Valla Rutera Doble Vía La Guardia', tipo: 'imagen', v: 2, est: 'aprobada', prev: null,
    arch: { ruta: 'piezas-creatividades/cocacola/valla-laguardia.jpg', mime: 'image/jpeg', tamano: 14200000 },
    valOk: true, bloq: null },

  // Brief 15: Hipermaxi Miércoles Frescura
  { n: 25, bf: 15, c: 12, nom: 'Aviso Diario El Deber 1/2 Página Ofertas', tipo: 'imagen', v: 1, est: 'aprobada', prev: null,
    arch: { ruta: 'piezas-creatividades/hipermaxi/prensa-frescura.pdf', mime: 'application/pdf', tamano: 11000000 },
    valOk: true, bloq: null },
  { n: 26, bf: 15, c: 12, nom: 'Carrusel Facebook 5 Slides Frutas y Carnes', tipo: 'imagen', v: 2, est: 'aprobada', prev: null,
    arch: { ruta: 'piezas-creatividades/hipermaxi/carrusel-fb.zip', mime: 'application/zip', tamano: 8500000 },
    valOk: true, bloq: null },

  // Brief 16: BoA Uyuni
  { n: 27, bf: 16, c: 13, nom: 'Master Video 60s Salar de Uyuni Experiencia', tipo: 'video', v: 1, est: 'aprobada', prev: null,
    arch: { ruta: 'piezas-creatividades/boa/uyuni-60s-4k.mp4', mime: 'video/mp4', tamano: 92000000 },
    valOk: true, bloq: null },
  { n: 28, bf: 16, c: 13, nom: 'Banners Digitales Red Display Google', tipo: 'imagen', v: 2, est: 'aprobada', prev: null,
    arch: { ruta: 'piezas-creatividades/boa/display-banners.zip', mime: 'application/zip', tamano: 4800000 },
    valOk: true, bloq: null },

  // Brief 17: INTI Mentisan Testimonial
  { n: 29, bf: 17, c: 14, nom: 'Spot Emotivo Mentisan 85 Años (Corte Director)', tipo: 'video', v: 1, est: 'en_revision', prev: null,
    arch: { ruta: 'piezas-creatividades/inti/spot-85anios-rough.mp4', mime: 'video/mp4', tamano: 75000000 },
    valOk: false, bloq: null },

  // Brief 18: INTI Lata Vintage
  { n: 30, bf: 18, c: 14, nom: 'Diseño 3D Lata de Colección 1941', tipo: 'imagen', v: 1, est: 'en_revision', prev: null,
    arch: { ruta: 'piezas-creatividades/inti/render-lata-vintage.png', mime: 'image/png', tamano: 15600000 },
    valOk: true, bloq: null },

  // Brief 19: Suzuki Swift Video Test Drive
  { n: 31, bf: 19, c: 15, nom: 'Video Showroom Suzuki Swift Hybrid', tipo: 'video', v: 1, est: 'aprobada', prev: null,
    arch: { ruta: 'piezas-creatividades/suzuki/testdrive-swift.mp4', mime: 'video/mp4', tamano: 48000000 },
    valOk: true, bloq: null },

  // Brief 20: Suzuki Swift Valla (Pieza Rechazada que provocó fallo en SAGA 3)
  { n: 32, bf: 20, c: 15, nom: 'Valla Principal Cristo Redentor (Versión 1 Rechazada)', tipo: 'imagen', v: 1, est: 'rechazada', prev: null,
    arch: { ruta: 'piezas-creatividades/suzuki/valla-cristo-v1-rechazada.jpg', mime: 'image/jpeg', tamano: 22000000 },
    valOk: false, bloq: null },
  { n: 33, bf: 20, c: 15, nom: 'Valla Principal Cristo Redentor (Reintento Borrador)', tipo: 'imagen', v: 2, est: 'en_revision', prev: null,
    arch: { ruta: 'piezas-creatividades/suzuki/valla-cristo-v2-draft.jpg', mime: 'image/jpeg', tamano: 23500000 },
    valOk: false, bloq: null }
];

let js = `// ============================================================================
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
`;

const bfDocs = briefs.map(b => {
  return `  {
    id: "${bfId(b.n)}",
    campana_id: "${cId(b.c)}",
    cliente_id: "${cliId(b.cli)}",
    titulo: "${b.tit}",
    descripcion: "${b.des}",
    estado: "${b.est}",
    version: 1,
    creado_en: new Date("2026-01-15T09:00:00Z"),
    actualizado_en: new Date("2026-01-20T14:00:00Z")
  }`;
});
js += bfDocs.join(',\n') + '\n]);\n\n';

js += `// 3. INSERCION DE 33 PIEZAS CREATIVAS (IDs: 1001 a 1033)
dbc.piezas.insertMany([
`;

const pzDocs = piezas.map(p => {
  const valObj = p.valOk ? `
    validaciones_marca: {
      manual_marca_ok: true,
      detalles: { paleta_colores: "cumple", logo_zona_segura: "cumple", contraste: "optimo" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },` : `
    validaciones_marca: {
      manual_marca_ok: false,
      detalles: { paleta_colores: "inconsistente", logo_zona_segura: "violada", tipografia: "no autorizada" },
      validado_at: new Date("2026-01-25T11:00:00Z")
    },`;

  return `  {
    id: "${pzId(p.n)}",
    brief_id: "${bfId(p.bf)}",
    campana_id: "${cId(p.c)}",
    nombre: "${p.nom}",
    tipo: "${p.tipo}",
    version_numero: ${p.v},
    archivo: {
      ruta: "${p.arch.ruta}",
      mime: "${p.arch.mime}",
      tamano: ${p.arch.tamano}
    },
    estado: "${p.est}",
    estado_previo: ${p.prev ? `"${p.prev}"` : 'null'},
    bloqueo_saga: ${p.bloq ? JSON.stringify(p.bloq) : 'null'},${valObj}
    version: 1,
    creado_en: new Date("2026-01-20T10:00:00Z"),
    actualizado_en: new Date("2026-01-25T12:00:00Z")
  }`;
});
js += pzDocs.join(',\n') + '\n]);\n\n';

js += `// 4. INSERCION DE AUDITORIAS DE VALIDACION DE MARCA (MANUAL Y POR IA)
dbc.validaciones_auditoria.insertMany([
  {
    pieza_id: "${pzId(1)}",
    resultado: "ok",
    origen: "ia",
    usuario: "agente_vision_ia",
    detalles: { confianza: 0.98, paleta: "RGB oficial BMSC verde/dorado", logo_detectado: true },
    creado_en: new Date("2026-01-22T08:30:00Z")
  },
  {
    pieza_id: "${pzId(1)}",
    resultado: "ok",
    origen: "manual",
    usuario: "supervisor.creativo@adorbit.bo",
    detalles: { comentario: "Aprobado para TV nacional y streaming digital." },
    creado_en: new Date("2026-01-22T10:00:00Z")
  },
  {
    pieza_id: "${pzId(6)}",
    resultado: "ok",
    origen: "ia",
    usuario: "agente_vision_ia",
    detalles: { confianza: 0.99, paleta: "Rojo/Blanco/Dorado Paceña", logo_ratio: "100% perfecto" },
    creado_en: new Date("2026-01-25T14:10:00Z")
  },
  {
    pieza_id: "${pzId(6)}",
    resultado: "ok",
    origen: "manual",
    usuario: "director.arte@adorbit.bo",
    detalles: { comentario: "Excelente ritmo audiovisual, colores respetan el manual de marca." },
    creado_en: new Date("2026-01-25T16:00:00Z")
  },
  {
    pieza_id: "${pzId(14)}",
    resultado: "observada",
    origen: "ia",
    usuario: "agente_vision_ia",
    detalles: { advertencia: "Texto 'San Juan' con contraste insuficiente sobre fondo de brasas" },
    creado_en: new Date("2026-02-01T09:00:00Z")
  },
  {
    pieza_id: "${pzId(32)}",
    resultado: "rechazada",
    origen: "ia",
    usuario: "agente_vision_ia",
    detalles: { fallo: "Logo Suzuki deformado horizontalmente (+14% ratio) y tipografía de precio no autorizada" },
    creado_en: new Date("2026-01-10T11:00:00Z")
  },
  {
    pieza_id: "${pzId(32)}",
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
    id: "${evtId(201)}",
    tipo_agregado: "Pieza",
    agregado_id: "${pzId(1)}",
    tipo_evento: "PiezaAprobada",
    carga: { pieza_id: "${pzId(1)}", campana_id: "${cId(1)}", tipo: "video" },
    publicado: true,
    creado_en: new Date("2026-01-22T10:05:00Z")
  },
  {
    id: "${evtId(202)}",
    tipo_agregado: "Pieza",
    agregado_id: "${pzId(6)}",
    tipo_evento: "PiezaAprobada",
    carga: { pieza_id: "${pzId(6)}", campana_id: "${cId(3)}", tipo: "video" },
    publicado: true,
    creado_en: new Date("2026-01-25T16:05:00Z")
  },
  {
    id: "${evtId(203)}",
    tipo_agregado: "Pieza",
    agregado_id: "${pzId(1)}",
    tipo_evento: "PiezasBloqueadas",
    carga: { saga_id: "${sId(1)}", campana_id: "${cId(1)}", total_piezas: 1 },
    publicado: true,
    creado_en: new Date("2026-02-01T12:02:00Z")
  },
  {
    id: "${evtId(204)}",
    tipo_agregado: "Pieza",
    agregado_id: "${pzId(32)}",
    tipo_evento: "BloqueoFallido",
    carga: { saga_id: "${sId(3)}", campana_id: "${cId(15)}", motivo: "Pieza en estado rechazada no puede bloquearse" },
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
    respuesta: { piezas_bloqueadas: ["${pzId(1)}", "${pzId(2)}"], estado: "bloqueadas" },
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
`;

fs.writeFileSync('base_de_datos/ms-creatividades.semillas.js', js, 'utf8');
console.log('base_de_datos/ms-creatividades.semillas.js generado con exito!');

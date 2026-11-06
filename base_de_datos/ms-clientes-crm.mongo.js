// ============================================================================
// ms-clientes-crm | MongoDB Atlas | MVC por capas (Laravel) | DB: adorbit_crm
// Dueno de: clientes, contratos, linea de credito, reservas de credito.
// Ejecutar con: mongosh "<cadena Atlas>" --file ms-clientes-crm.mongo.js
// NOTA: consolidado a partir del script del companero + correcciones de revision.
// IDs entre servicios: campo "id" UUID (string). _id (ObjectId) es solo interno.
// Montos: Decimal128 (NumberDecimal) o centavos enteros. Aqui: Decimal128.
// ============================================================================
const dbc = db.getSiblingDB("adorbit_crm");

const uuid = { bsonType: "string", pattern: "^[0-9a-fA-F-]{36}$" };
const moneda = { enum: ["BOB", "USD"] };

// --------------------------------------------------------------- clientes
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
// NIT unico solo cuando exista (parcial)
dbc.clientes.createIndex({ nit: 1 }, { unique: true, partialFilterExpression: { nit: { $type: "string" } } });
dbc.clientes.createIndex({ estado: 1 });

// -------------------------------------------------------------- contratos
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

// ------------------------------------------------------- reservas de credito
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
dbc.reservas_credito.createIndex({ id: 1 }, { unique: true });               // id UUID compartido (reserva_id en eventos)
dbc.reservas_credito.createIndex({ saga_id: 1 }, { unique: true });          // idempotencia
dbc.reservas_credito.createIndex({ campana_id: 1 },                           // 1 reserva ACTIVA por campana
  { unique: true, partialFilterExpression: { estado: "reservado" } });
dbc.reservas_credito.createIndex({ cliente_id: 1, estado: 1 });

// ------------------------------------------------- idempotencia y outbox
dbc.createCollection("claves_idempotencia");
dbc.claves_idempotencia.createIndex({ clave: 1 }, { unique: true });
dbc.claves_idempotencia.createIndex({ vence_en: 1 }, { expireAfterSeconds: 0 });

dbc.createCollection("bandeja_salida_eventos");
dbc.bandeja_salida_eventos.createIndex({ id: 1 }, { unique: true });
dbc.bandeja_salida_eventos.createIndex({ creado_en: 1 }, { partialFilterExpression: { publicado: false } });

// --------------------------------------- operaciones de la SAGA (referencia)
// Todas dentro de UNA transaccion (Atlas es replica set; funciona en M0).
// RESERVAR (registrar antes sagaId:paso en claves_idempotencia):
//   const r = clientes.updateOne(
//     { id: clienteId, $expr: { $gte: [ { $subtract: ["$linea_credito.limite",
//                                                     "$linea_credito.usado"] }, monto ] } },
//     { $inc: { "linea_credito.usado": monto } });
//   if (r.modifiedCount === 0) throw new Error("CREDITO_INSUFICIENTE");   // el paso FALLA
//   reservas_credito.insertOne({ cliente_id, campana_id, saga_id, monto, moneda,
//     estado: "reservado", creado_en: new Date(), actualizado_en: new Date() });
//   bandeja_salida_eventos.insertOne({ ...CreditoReservado });
// LIBERAR (compensacion, idempotente):
//   const r = reservas_credito.updateOne({ saga_id, estado: "reservado" },
//                                        { $set: { estado: "liberado", actualizado_en: new Date() } });
//   if (r.modifiedCount === 1)
//     clientes.updateOne({ id: clienteId }, { $inc: { "linea_credito.usado": -monto } });
// CONSUMIR (SAGA completada): estado "consumido"; NO se toca "usado".

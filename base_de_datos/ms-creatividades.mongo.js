// ============================================================================
// ms-creatividades | MongoDB Atlas | Clean Architecture | DB: adorbit_creatividades
// Dueno de: briefs, piezas (versionadas, con bloqueo de SAGA), auditoria de validaciones.
// Ejecutar con: mongosh "<cadena Atlas>" --file ms-creatividades.mongo.js
// NOTA: consolidado a partir del script del companero + correcciones de revision.
// IDs entre servicios: campo "id" UUID (string). _id (ObjectId) es solo interno.
// ============================================================================
const dbc = db.getSiblingDB("adorbit_creatividades");

const uuid = { bsonType: "string", pattern: "^[0-9a-fA-F-]{36}$" };

// ----------------------------------------------------------------- briefs
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

// ----------------------------------------------------------------- piezas
dbc.createCollection("piezas", { validator: { $jsonSchema: {
  bsonType: "object",
  required: ["id", "brief_id", "version_numero", "estado", "creado_en"],
  properties: {
    id: uuid, brief_id: uuid, campana_id: uuid,
    nombre: { bsonType: "string" },
    tipo: { enum: ["imagen", "video", "copy", "audio"] },
    version_numero: { bsonType: "number", minimum: 1 },
    archivo: { bsonType: "object", properties: {      // el archivo vive en Storage/S3
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
    version: { bsonType: "number" },                     // version del documento (conflictos offline)
    creado_en: { bsonType: "date" }, actualizado_en: { bsonType: "date" }
  }
}}, validationLevel: "moderate" });
dbc.piezas.createIndex({ id: 1 }, { unique: true });
dbc.piezas.createIndex({ brief_id: 1, version_numero: 1 }, { unique: true });
dbc.piezas.createIndex({ campana_id: 1, estado: 1 });
// SAGA: buscar por saga y liberar bloqueos vencidos (NO usar TTL: borraria la pieza)
dbc.piezas.createIndex({ "bloqueo_saga.saga_id": 1 },
  { partialFilterExpression: { estado: "bloqueada_saga" } });
dbc.piezas.createIndex({ "bloqueo_saga.expira_at": 1 },
  { partialFilterExpression: { estado: "bloqueada_saga" } });

// ------------------------------------------------- auditoria de validaciones
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
dbc.validaciones_auditoria.createIndex({ pieza_id: 1, creado_en: -1 });   // sin TTL

// ------------------------------------------------- idempotencia y outbox
dbc.createCollection("claves_idempotencia");
dbc.claves_idempotencia.createIndex({ clave: 1 }, { unique: true });
dbc.claves_idempotencia.createIndex({ vence_en: 1 }, { expireAfterSeconds: 0 });
// documento: { clave, huella_solicitud, estado: "EN_CURSO"|"COMPLETADO", codigo_estado, respuesta,
//              creado_en, vence_en (= +14 dias) }

dbc.createCollection("bandeja_salida_eventos");
dbc.bandeja_salida_eventos.createIndex({ id: 1 }, { unique: true });              // id_evento (UUID)
dbc.bandeja_salida_eventos.createIndex({ creado_en: 1 }, { partialFilterExpression: { publicado: false } });
// documento: { id, tipo_agregado, agregado_id, tipo_evento, carga, publicado: false,
//              creado_en, publicado_en }

// ------------------------------------------- operaciones de la SAGA (referencia)
// Bloquear (atomico; registrar antes sagaId:paso en claves_idempotencia):
//   dbc.piezas.updateOne(
//     { id: piezaId, estado: "aprobada" },
//     { $set: { estado: "bloqueada_saga", estado_previo: "aprobada",
//               bloqueo_saga: { saga_id, campana_id, bloqueado_at: new Date(),
//                               expira_at: new Date(Date.now() + 10*60*1000) } } })
//   // modifiedCount == 0  => la pieza ya estaba tomada: el paso FALLA
// Liberar (compensacion; solo si el bloqueo es de ESA saga):
//   dbc.piezas.updateOne(
//     { id: piezaId, estado: "bloqueada_saga", "bloqueo_saga.saga_id": saga_id },
//     { $set: { estado: "aprobada" }, $unset: { bloqueo_saga: "" } })
// Un job (n8n o cron) libera los bloqueos con expira_at vencido; el paso de
// confirmacion de la SAGA debe fallar si el bloqueo ya no existe.

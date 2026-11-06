const assert = require("assert");
const { buildSchema } = require("graphql");
const { typeDefs } = require("../dist/esquema");

console.log("Validando sintaxis del esquema GraphQL...");
const schema = buildSchema(typeDefs);
assert(schema.getType("Campana"), "Debe existir el tipo Campana");
assert(schema.getType("Presupuesto"), "Debe existir el tipo Presupuesto");
assert(schema.getType("CalendarioMedio"), "Debe existir el tipo CalendarioMedio");
assert(schema.getType("Cliente"), "Debe existir el tipo Cliente");
assert(schema.getType("SagaTransaccion"), "Debe existir el tipo SagaTransaccion");
assert(schema.getQueryType().getFields()["campanas"], "Debe existir el query campanas");
assert(schema.getQueryType().getFields()["campana"], "Debe existir el query campana");
assert(schema.getMutationType().getFields()["crearCampana"], "Debe existir la mutacion crearCampana");
assert(schema.getMutationType().getFields()["contratarCampana"], "Debe existir la mutacion contratarCampana");

console.log("¡Esquema GraphQL verificado exitosamente!");

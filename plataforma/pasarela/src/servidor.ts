import express, { Request, Response } from "express";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { createProxyMiddleware } from "http-proxy-middleware";
import dotenv from "dotenv";
import { typeDefs, resolvers } from "./esquema";
import { middlewareAutenticacion, PeticionAutenticada } from "./autenticacion";
import { crearRouterAdministracionIdentidad } from "./administracion-identidad";

dotenv.config();

const PUERTO = process.env.PORT || 8000;
const URL_MS_CAMPANAS = process.env.URL_MS_CAMPANAS || "http://localhost:8081";
const URL_MS_CLIENTES_CRM = process.env.URL_MS_CLIENTES_CRM || "http://localhost:8082";
const URL_MS_FACTURACION = process.env.URL_MS_FACTURACION || "http://localhost:8083";
const URL_MS_CREATIVIDADES = process.env.URL_MS_CREATIVIDADES || "http://localhost:8084";
const URL_MS_IA = process.env.URL_MS_IA || "http://localhost:8085";

async function iniciarServidor() {
  const app = express();

  app.use(cors({ origin: "*", credentials: true }));

  // Salud y preparación
  app.get("/salud", (_req: Request, res: Response) => {
    res.json({ estado: "SALUDABLE", servicio: "adorbit-pasarela", marca_tiempo: new Date().toISOString() });
  });

  app.get("/listo", (_req: Request, res: Response) => {
    res.json({ estado: "LISTO", servicio: "adorbit-pasarela" });
  });

  // Autenticación global
  app.use(middlewareAutenticacion as any);

  app.use("/api/v1/administracion", express.json(), crearRouterAdministracionIdentidad());

  // Proxies REST transparentes hacia microservicios
  // ms-campanas
  app.use(
    ["/api/v1/campanas", "/api/v1/sagas"],
    createProxyMiddleware({
      target: URL_MS_CAMPANAS,
      changeOrigin: true,
      // Express quita el prefijo montado en app.use(); se reenvia la URL original completa.
      pathRewrite: (_ruta, req) => (req as Request).originalUrl
    })
  );

  // ms-clientes-crm
  app.use(
    ["/api/v1/clientes", "/api/v1/contratos"],
    createProxyMiddleware({
      target: URL_MS_CLIENTES_CRM,
      changeOrigin: true,
      // Express quita el prefijo montado en app.use(); se reenvia la URL original completa.
      pathRewrite: (_ruta, req) => (req as Request).originalUrl
    })
  );

  // ms-facturacion
  app.use(
    ["/api/v1/facturas", "/api/v1/cotizaciones"],
    createProxyMiddleware({
      target: URL_MS_FACTURACION,
      changeOrigin: true,
      // Express quita el prefijo montado en app.use(); se reenvia la URL original completa.
      pathRewrite: (_ruta, req) => (req as Request).originalUrl
    })
  );

  // ms-creatividades
  app.use(
    ["/api/v1/briefs", "/api/v1/piezas"],
    createProxyMiddleware({
      target: URL_MS_CREATIVIDADES,
      changeOrigin: true,
      // Express quita el prefijo montado en app.use(); se reenvia la URL original completa.
      pathRewrite: (_ruta, req) => (req as Request).originalUrl
    })
  );

  // ms-ia
  app.use(
    [
      "/api/v1/reportes",
      "/api/v1/agentes",
      "/api/v1/alertas",
      "/api/v1/vision",
      "/api/v1/mcp",
      "/api/v1/ml",
      "/api/v1/asistente"
    ],
    createProxyMiddleware({
      target: URL_MS_IA,
      changeOrigin: true,
      // Express quita el prefijo montado en app.use(); se reenvia la URL original completa.
      pathRewrite: (_ruta, req) => (req as Request).originalUrl
    })
  );

  // GraphQL Apollo Server
  const servidorApolo = new ApolloServer({
    typeDefs,
    resolvers
  });

  await servidorApolo.start();

  app.use(
    "/graphql",
    express.json(),
    expressMiddleware(servidorApolo, {
      context: async ({ req }) => {
        const peticion = req as PeticionAutenticada;
        return {
          token: req.headers.authorization,
          usuario: peticion.usuario
        };
      }
    })
  );

  app.listen(PUERTO, () => {
    console.log(`[Pasarela] Gateway de AdOrbit escuchando en http://localhost:${PUERTO}`);
    console.log(`[Pasarela] GraphQL disponible en http://localhost:${PUERTO}/graphql`);
  });
}

iniciarServidor().catch((error) => {
  console.error("[Pasarela] Error fatal al iniciar:", error);
  process.exit(1);
});


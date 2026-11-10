import express, { Request, Response } from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
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

// Cargar imagen de tarjeta ejecutiva AdOrbit en memoria para adjuntar en WhatsApp
let BANNER_CARD_B64 = "";
try {
  const rutaBanner = path.resolve(__dirname, "../assets/card-banner.png");
  if (fs.existsSync(rutaBanner)) {
    BANNER_CARD_B64 = fs.readFileSync(rutaBanner).toString("base64");
  }
} catch {
  // Opcional: si no existe la imagen se envia mensaje de texto
}

function normalizarOrtografiaEspanol(str: string): string {
  if (!str) return str;
  return str
    .replace(/\bcampana\b/gi, (m) => m === 'campana' ? 'campaña' : (m === 'CAMPANA' ? 'CAMPAÑA' : 'Campaña'))
    .replace(/\bcampanas\b/gi, (m) => m === 'campanas' ? 'campañas' : (m === 'CAMPANAS' ? 'CAMPAÑAS' : 'Campañas'))
    .replace(/\bdiseno\b/gi, (m) => m === 'diseno' ? 'diseño' : (m === 'DISENO' ? 'DISEÑO' : 'Diseño'))
    .replace(/\bdisenos\b/gi, (m) => m === 'disenos' ? 'diseños' : (m === 'DISENOS' ? 'DISEÑOS' : 'Diseños'))
    .replace(/\banalisis\b/gi, (m) => m === 'analisis' ? 'análisis' : (m === 'ANALISIS' ? 'ANÁLISIS' : 'Análisis'))
    .replace(/\bauditoria\b/gi, (m) => m === 'auditoria' ? 'auditoría' : (m === 'AUDITORIA' ? 'AUDITORÍA' : 'Auditoría'))
    .replace(/\bvision\b/gi, (m) => m === 'vision' ? 'visión' : (m === 'VISION' ? 'VISIÓN' : 'Visión'))
    .replace(/\bclasificacion\b/gi, (m) => m === 'clasificacion' ? 'clasificación' : (m === 'CLASIFICACION' ? 'CLASIFICACIÓN' : 'Clasificación'))
    .replace(/\bconfiguracion\b/gi, (m) => m === 'configuracion' ? 'configuración' : (m === 'CONFIGURACION' ? 'CONFIGURACIÓN' : 'Configuración'))
    .replace(/\bejecucion\b/gi, (m) => m === 'ejecucion' ? 'ejecución' : (m === 'EJECUCION' ? 'EJECUCIÓN' : 'Ejecución'))
    .replace(/\bejecuciones\b/gi, (m) => m === 'ejecuciones' ? 'ejecuciones' : (m === 'EJECUCIONES' ? 'EJECUCIONES' : 'Ejecuciones'))
    .replace(/\bvalidacion\b/gi, (m) => m === 'validacion' ? 'validación' : (m === 'VALIDACION' ? 'VALIDACIÓN' : 'Validación'))
    .replace(/\bdescripcion\b/gi, (m) => m === 'descripcion' ? 'descripción' : (m === 'DESCRIPCION' ? 'DESCRIPCIÓN' : 'Descripción'))
    .replace(/\binversion\b/gi, (m) => m === 'inversion' ? 'inversión' : (m === 'INVERSION' ? 'INVERSIÓN' : 'Inversión'))
    .replace(/\bduracion\b/gi, (m) => m === 'duracion' ? 'duración' : (m === 'DURACION' ? 'DURACIÓN' : 'Duración'))
    .replace(/\bnumero\b/gi, (m) => m === 'numero' ? 'número' : (m === 'NUMERO' ? 'NÚMERO' : 'Número'))
    .replace(/\btelefono\b/gi, (m) => m === 'telefono' ? 'teléfono' : (m === 'TELEFONO' ? 'TELÉFONO' : 'Teléfono'))
    .replace(/\bevaluacion\b/gi, (m) => m === 'evaluacion' ? 'evaluación' : (m === 'EVALUACION' ? 'EVALUACIÓN' : 'Evaluación'))
    .replace(/\bano\b/gi, (m) => m === 'ano' ? 'año' : (m === 'ANO' ? 'AÑO' : 'Año'))
    .replace(/\banos\b/gi, (m) => m === 'anos' ? 'años' : (m === 'ANOS' ? 'AÑOS' : 'Años'))
    .replace(/\btamano\b/gi, (m) => m === 'tamano' ? 'tamaño' : (m === 'TAMANO' ? 'TAMAÑO' : 'Tamaño'))
    .replace(/\bkpis\b/gi, 'KPIs')
    .replace(/\bctr\b/gi, 'CTR')
    .replace(/\bcpc\b/gi, 'CPC')
    .replace(/\bcpa\b/gi, 'CPA')
    .replace(/\broas\b/gi, 'ROAS');
}

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

  // Canal WhatsApp (despacho real por UltraMsg + registro en consola)
  app.post("/api/v1/simulador-whatsapp", express.json(), async (req, res) => {
    const { telefono, mensaje, canal } = req.body || {};
    const destino = telefono || process.env.ADORBIT_WHATSAPP_NUMERO_GERENCIA || "+59169215158";
    const mensajeNormalizado = normalizarOrtografiaEspanol(String(mensaje || ""));
    console.log(`[WHATSAPP ADORBIT] Destino: ${destino}`);
    console.log(`[WHATSAPP MENSAJE]:\n${mensajeNormalizado}\n-----------------------------------`);

    const ultramsgInstance = process.env.ADORBIT_ULTRAMSG_INSTANCE;
    const ultramsgToken = process.env.ADORBIT_ULTRAMSG_TOKEN;

    if (ultramsgInstance && ultramsgToken && mensajeNormalizado) {
      try {
        const imagenParaEnviar = req.body.imagen || req.body.imagen_b64 || BANNER_CARD_B64;
        let url = `https://api.ultramsg.com/${ultramsgInstance}/messages/chat`;
        let payload: any;
        let headers: Record<string, string> = {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AdOrbit/1.0"
        };

        if (imagenParaEnviar) {
          url = `https://api.ultramsg.com/${ultramsgInstance}/messages/image`;
          headers["Content-Type"] = "application/json";
          payload = JSON.stringify({
            token: ultramsgToken,
            to: destino,
            image: imagenParaEnviar,
            caption: mensajeNormalizado
          });
        } else {
          headers["Content-Type"] = "application/x-www-form-urlencoded";
          payload = new URLSearchParams({
            token: ultramsgToken,
            to: destino,
            body: mensajeNormalizado
          });
        }

        const respuesta = await fetch(url, {
          method: "POST",
          headers,
          body: payload
        });
        const jsonResp = await respuesta.json();
        console.log(`[WHATSAPP ULTRAMSG ENTREGADO]:`, jsonResp);
      } catch (error) {
        console.warn(`[WHATSAPP ULTRAMSG ERROR]:`, error);
      }
    }

    res.status(200).json({
      ok: true,
      mensaje: "Mensaje procesado por el canal de WhatsApp de AdOrbit",
      canal: canal || "whatsapp",
      destinatario: destino,
      entregado_en: new Date().toISOString()
    });
  });

  // Autenticación global
  app.use(middlewareAutenticacion as any);

  app.use("/api/v1/administracion", express.json(), crearRouterAdministracionIdentidad());

  // Proxies REST transparentes hacia microservicios
  const crearProxy = (target: string, nombreServicio: string) =>
    createProxyMiddleware({
      target,
      changeOrigin: true,
      proxyTimeout: 8000,
      timeout: 8000,
      // Express quita el prefijo montado en app.use(); se reenvia la URL original completa.
      pathRewrite: (_ruta, req) => (req as Request).originalUrl,
      on: {
        error: (_err, _req, res) => {
          const respuesta = res as Response;
          if (!respuesta.headersSent) {
            respuesta.status(504).json({
              codigo: "SERVICIO_NO_DISPONIBLE",
              mensaje: `El microservicio ${nombreServicio} no responde temporalmente.`,
            });
          }
        },
      },
    });

  // ms-campanas
  app.use(["/api/v1/campanas", "/api/v1/sagas"], crearProxy(URL_MS_CAMPANAS, "ms-campanas"));

  // ms-clientes-crm
  app.use(["/api/v1/clientes", "/api/v1/contratos"], crearProxy(URL_MS_CLIENTES_CRM, "ms-clientes-crm"));

  // ms-facturacion
  app.use(["/api/v1/facturas", "/api/v1/cotizaciones"], crearProxy(URL_MS_FACTURACION, "ms-facturacion"));

  // ms-creatividades
  app.use(["/api/v1/briefs", "/api/v1/piezas"], crearProxy(URL_MS_CREATIVIDADES, "ms-creatividades"));

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
    crearProxy(URL_MS_IA, "ms-ia")
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


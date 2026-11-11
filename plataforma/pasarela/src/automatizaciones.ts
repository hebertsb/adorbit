import { Router, Response } from "express";
import { PeticionAutenticada } from "./autenticacion";

/**
 * Vista de solo lectura de las automatizaciones de n8n para el portal de gestión.
 * La pasarela consulta la API pública de n8n con una API key (variable de entorno, nunca
 * en el navegador) y devuelve una forma reducida: flujos y últimas ejecuciones.
 * Solo rol gerente (el admin global también lo tiene).
 */
const URL_N8N = (process.env.ADORBIT_PASARELA_N8N_URL || "http://100.99.124.109:5678").replace(/\/+$/, "");
const URL_EDITOR_N8N = process.env.ADORBIT_PASARELA_N8N_EDITOR_URL || URL_N8N;
const API_KEY_N8N = process.env.ADORBIT_PASARELA_N8N_API_KEY || "";
const LIMITE_EJECUCIONES = 25;

interface FlujoN8n {
  id: string;
  name: string;
  active: boolean;
  updatedAt?: string;
  tags?: { name: string }[];
}

interface EjecucionN8n {
  id: string | number;
  workflowId: string;
  status?: string;
  finished?: boolean;
  mode?: string;
  startedAt?: string;
  stoppedAt?: string | null;
}

async function consultarN8n<T>(ruta: string): Promise<T> {
  const respuesta = await fetch(`${URL_N8N}/api/v1${ruta}`, {
    headers: { "X-N8N-API-KEY": API_KEY_N8N, Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!respuesta.ok) {
    throw new Error(`n8n respondió ${respuesta.status}`);
  }
  return (await respuesta.json()) as T;
}

function exigirGerente(req: PeticionAutenticada, res: Response): boolean {
  const acceso = req.usuario?.realm_access as { roles?: string[] } | undefined;
  if (!acceso?.roles?.includes("gerente")) {
    res.status(403).json({ codigo: "sin_permiso", mensaje: "Solo gerencia puede ver las automatizaciones" });
    return false;
  }
  return true;
}

export function crearRouterAutomatizaciones(): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    if (!exigirGerente(req as PeticionAutenticada, res)) return;
    if (!API_KEY_N8N) {
      res.status(503).json({
        codigo: "n8n_no_configurado",
        mensaje: "Falta ADORBIT_PASARELA_N8N_API_KEY en la pasarela",
        editor_url: URL_EDITOR_N8N,
      });
      return;
    }

    try {
      const [flujos, ejecuciones] = await Promise.all([
        consultarN8n<{ data: FlujoN8n[] }>("/workflows?limit=100"),
        consultarN8n<{ data: EjecucionN8n[] }>(`/executions?limit=${LIMITE_EJECUCIONES}`),
      ]);
      const nombres = new Map(flujos.data.map((f) => [String(f.id), f.name]));

      res.json({
        editor_url: URL_EDITOR_N8N,
        flujos: flujos.data
          .map((f) => ({
            id: String(f.id),
            nombre: f.name,
            activo: f.active,
            actualizado_en: f.updatedAt ?? null,
            etiquetas: (f.tags ?? []).map((t) => t.name),
          }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
        ejecuciones: ejecuciones.data.map((e) => ({
          id: String(e.id),
          flujo_id: String(e.workflowId),
          flujo_nombre: nombres.get(String(e.workflowId)) ?? "Flujo eliminado",
          estado: e.status || (e.finished ? "success" : e.stoppedAt ? "error" : "running"),
          modo: e.mode ?? null,
          inicio: e.startedAt ?? null,
          fin: e.stoppedAt ?? null,
        })),
      });
    } catch (error) {
      res.status(502).json({
        codigo: "n8n_no_disponible",
        mensaje: "No se pudo consultar n8n",
        detalle: (error as Error).message,
        editor_url: URL_EDITOR_N8N,
      });
    }
  });

  return router;
}

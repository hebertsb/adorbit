import { Router, type Response as ExpressResponse } from "express";
import type { PeticionAutenticada } from "./autenticacion";

const BASE = process.env.KEYCLOAK_ADMIN_BASE_URL ?? "http://keycloak:8080";
const REALM = process.env.KEYCLOAK_ADMIN_REALM ?? "adorbit";
const CLIENTE = process.env.KEYCLOAK_ADMIN_CLIENT_ID ?? "pasarela-admin";
const SECRETO = process.env.KEYCLOAK_ADMIN_CLIENT_SECRET ?? "";
const ROLES_ADORBIT = ["ejecutivo", "creativo", "cliente", "gerente"];

type UsuarioKeycloak = {
  id: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled?: boolean;
  attributes?: Record<string, string[]>;
};

function exigirGerencia(req: PeticionAutenticada, res: ExpressResponse): boolean {
  const acceso = req.usuario?.realm_access as { roles?: string[] } | undefined;
  if (!acceso?.roles?.includes("gerente")) {
    res.status(403).json({ codigo: "SIN_PERMISO", mensaje: "Se requiere el rol gerente" });
    return false;
  }
  return true;
}

async function tokenAdministrativo(): Promise<string> {
  if (!SECRETO) throw new Error("KEYCLOAK_ADMIN_CLIENT_SECRET no configurado");
  const cuerpo = new URLSearchParams({
    grant_type: "client_credentials", client_id: CLIENTE, client_secret: SECRETO,
  });
  const respuesta = await fetch(`${BASE}/realms/${REALM}/protocol/openid-connect/token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: cuerpo,
  });
  if (!respuesta.ok) throw new Error(`Keycloak no emitió token administrativo (${respuesta.status})`);
  return ((await respuesta.json()) as { access_token: string }).access_token;
}

async function keycloak(ruta: string, opciones: RequestInit = {}): Promise<globalThis.Response> {
  const token = await tokenAdministrativo();
  return fetch(`${BASE}/admin/realms/${REALM}${ruta}`, {
    ...opciones,
    headers: { Authorization: `Bearer ${token}`, ...(opciones.body ? { "Content-Type": "application/json" } : {}), ...opciones.headers },
  });
}

async function rolesUsuario(id: string): Promise<string[]> {
  const respuesta = await keycloak(`/users/${encodeURIComponent(id)}/role-mappings/realm`);
  if (!respuesta.ok) throw new Error(`No se pudieron leer roles (${respuesta.status})`);
  const roles = (await respuesta.json()) as { name: string }[];
  return roles.map((rol) => rol.name).filter((rol) => ROLES_ADORBIT.includes(rol));
}

async function representacionesRoles(nombres: string[]): Promise<{ id: string; name: string }[]> {
  return Promise.all(nombres.map(async (nombre) => {
    const respuesta = await keycloak(`/roles/${encodeURIComponent(nombre)}`);
    if (!respuesta.ok) throw new Error(`El rol ${nombre} no existe`);
    return respuesta.json() as Promise<{ id: string; name: string }>;
  }));
}

export function crearRouterAdministracionIdentidad(): Router {
  const router = Router();

  router.get("/usuarios", async (req: PeticionAutenticada, res) => {
    if (!exigirGerencia(req, res)) return;
    try {
      const respuesta = await keycloak("/users?max=200");
      if (!respuesta.ok) return res.status(502).json({ mensaje: `Keycloak respondió ${respuesta.status}` });
      const usuarios = (await respuesta.json()) as UsuarioKeycloak[];
      const salida = await Promise.all(usuarios.map(async (usuario) => ({
        id: usuario.id,
        usuario: usuario.username ?? "",
        email: usuario.email ?? "",
        nombre: [usuario.firstName, usuario.lastName].filter(Boolean).join(" "),
        habilitado: usuario.enabled ?? false,
        cliente_id: usuario.attributes?.cliente_id?.[0] ?? null,
        roles: await rolesUsuario(usuario.id),
      })));
      res.json({ contenido: salida, total: salida.length });
    } catch (error) {
      res.status(502).json({ mensaje: error instanceof Error ? error.message : "Fallo de identidad" });
    }
  });

  router.post("/usuarios", async (req: PeticionAutenticada, res) => {
    if (!exigirGerencia(req, res)) return;
    const { usuario, email, nombre, apellido, contrasena_temporal, roles, cliente_id } = req.body ?? {};
    if (!usuario || !email || !nombre || !contrasena_temporal || !Array.isArray(roles) || roles.length === 0 ||
        roles.some((rol: string) => !ROLES_ADORBIT.includes(rol))) {
      return res.status(400).json({ mensaje: "Datos de usuario o roles inválidos" });
    }
    if (roles.includes("cliente") && !cliente_id) {
      return res.status(400).json({ mensaje: "El rol cliente requiere cliente_id" });
    }
    try {
      const respuesta = await keycloak("/users", {
        method: "POST",
        body: JSON.stringify({
          username: usuario, email, firstName: nombre, lastName: apellido ?? "",
          enabled: true, emailVerified: false,
          ...(cliente_id ? { attributes: { cliente_id: [cliente_id] } } : {}),
          credentials: [{ type: "password", value: contrasena_temporal, temporary: true }],
        }),
      });
      if (!respuesta.ok) {
        const detalle = await respuesta.text();
        return res.status(respuesta.status === 409 ? 409 : 502).json({ mensaje: detalle || `Keycloak respondió ${respuesta.status}` });
      }
      const id = respuesta.headers.get("location")?.split("/").pop();
      if (!id) throw new Error("Keycloak no devolvió el identificador del usuario");
      const representaciones = await representacionesRoles(roles);
      const asignacion = await keycloak(`/users/${id}/role-mappings/realm`, { method: "POST", body: JSON.stringify(representaciones) });
      if (!asignacion.ok) throw new Error(`No se pudieron asignar roles (${asignacion.status})`);
      res.status(201).json({ id, usuario, email, roles, habilitado: true, cliente_id: cliente_id ?? null });
    } catch (error) {
      res.status(502).json({ mensaje: error instanceof Error ? error.message : "Fallo de identidad" });
    }
  });

  router.put("/usuarios/:id/estado", async (req: PeticionAutenticada, res) => {
    if (!exigirGerencia(req, res)) return;
    if (typeof req.body?.habilitado !== "boolean") return res.status(400).json({ mensaje: "habilitado debe ser booleano" });
    try {
      const respuesta = await keycloak(`/users/${encodeURIComponent(req.params.id)}`, {
        method: "PUT", body: JSON.stringify({ enabled: req.body.habilitado }),
      });
      if (!respuesta.ok) return res.status(502).json({ mensaje: `Keycloak respondió ${respuesta.status}` });
      res.status(204).end();
    } catch (error) { res.status(502).json({ mensaje: error instanceof Error ? error.message : "Fallo de identidad" }); }
  });

  router.put("/usuarios/:id/contrasena", async (req: PeticionAutenticada, res) => {
    if (!exigirGerencia(req, res)) return;
    if (!req.body?.contrasena_temporal) return res.status(400).json({ mensaje: "Falta contraseña temporal" });
    try {
      const respuesta = await keycloak(`/users/${encodeURIComponent(req.params.id)}/reset-password`, {
        method: "PUT", body: JSON.stringify({ type: "password", value: req.body.contrasena_temporal, temporary: true }),
      });
      if (!respuesta.ok) return res.status(502).json({ mensaje: `Keycloak respondió ${respuesta.status}` });
      res.status(204).end();
    } catch (error) { res.status(502).json({ mensaje: error instanceof Error ? error.message : "Fallo de identidad" }); }
  });

  return router;
}

#!/usr/bin/env node
// Keycloak SIMULADO para desarrollo local (NO es seguridad real: no valida contrasenas). Sirve hasta que exista el
// realm de verdad (plataforma/keycloak). Emite JWT RS256 con la misma forma que Keycloak (realm_access.roles, aud,
// iss, cliente_id) y publica el JWKS, de modo que ms-facturacion y ms-clientes-crm los validan como si fueran reales.
//
//   node herramientas/keycloak-simulado.mjs                     # escucha en 127.0.0.1:8180
//   ESCUCHAR=0.0.0.0 node herramientas/keycloak-simulado.mjs    # si n8n (Docker) debe alcanzarlo
//
// Flujos soportados:
//   - client_credentials (servicios, p. ej. n8n):  POST /realms/adorbit/protocol/openid-connect/token
//   - Authorization Code + PKCE (portales web), con refresh token rotativo (DURACION_S acorta el access token):    GET  /realms/adorbit/protocol/openid-connect/auth  (pantalla de ingreso)
//   - Descubrimiento OIDC, JWKS y cierre de sesion, con CORS para los portales.
//   - Atajo de desarrollo:                         GET  /emitir?roles=cliente&cliente_id=<uuid>
//
// Variables: PUERTO (8180) · ESCUCHAR (127.0.0.1) · EMISOR (http://localhost:8180/realms/adorbit)
//   AUDIENCIAS (ms-facturacion,ms-clientes-crm,ms-ia,ms-creatividades) · CLIENTES (cuentas de servicio, JSON)
//   USUARIOS (JSON: [{"usuario":"ana","nombre":"Ana Rojas","roles":["cliente"],"cliente_id":"<uuid>"}])
//   CLIENTES_PUBLICOS (portal-cliente,panel-inteligencia) · REDIRECCIONES (prefijos permitidos: puertos 5173/4173 y 5174/4174)
import { createHash, createSign, generateKeyPairSync, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';

const PUERTO = Number(process.env.PUERTO ?? 8180);
const ESCUCHAR = process.env.ESCUCHAR ?? '127.0.0.1';
const EMISOR = process.env.EMISOR ?? `http://localhost:${PUERTO}/realms/adorbit`;
const AUDIENCIAS = (process.env.AUDIENCIAS ?? 'ms-facturacion,ms-clientes-crm,ms-ia,ms-creatividades').split(',');
const CLIENTES = JSON.parse(process.env.CLIENTES ?? '{"n8n":{"secret":"secreto-local","roles":["gerente"]}}');
const USUARIOS = JSON.parse(process.env.USUARIOS ?? '[]');
const CLIENTES_PUBLICOS = (process.env.CLIENTES_PUBLICOS ?? 'portal-cliente,panel-inteligencia').split(',');
const REDIRECCIONES = (process.env.REDIRECCIONES ?? 'http://localhost:5173,http://localhost:4173,http://localhost:5174,http://localhost:4174').split(',');
const DURACION_S = Number(process.env.DURACION_S ?? 300); // duracion del access token (corta para probar la renovacion)
const DURACION_REFRESCO_S = 1800;
const BASE = '/realms/adorbit/protocol/openid-connect';

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
// kid distinto en cada arranque: los validadores que cachean el JWKS lo vuelven a pedir al ver un kid desconocido.
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: `simulado-${randomUUID().slice(0, 8)}`, use: 'sig', alg: 'RS256' };
const codigos = new Map(); // code -> { cliente, redirigir, desafio, nonce, usuario }
const refrescos = new Map(); // refresh_token -> { cliente, usuario, vence }

const b64 = (x) => Buffer.from(x).toString('base64url');
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function firmar(claims) {
  const cabecera = b64(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: jwk.kid }));
  const carga = b64(JSON.stringify(claims));
  const firma = createSign('RSA-SHA256').update(`${cabecera}.${carga}`).sign(privateKey).toString('base64url');
  return `${cabecera}.${carga}.${firma}`;
}

const ahora = () => Math.floor(Date.now() / 1000);

function tokenAcceso({ sub, roles, extra = {} }) {
  return firmar({ iss: EMISOR, aud: AUDIENCIAS, sub, iat: ahora(), exp: ahora() + DURACION_S, jti: randomUUID(), realm_access: { roles }, ...extra });
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
}

function json(res, estado, cuerpo) {
  cors(res);
  res.writeHead(estado, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(cuerpo));
}

function html(res, estado, cuerpo) {
  res.writeHead(estado, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Keycloak simulado</title><style>body{font:16px system-ui;max-width:440px;margin:32px auto;padding:0 16px;color:#1f2937}
h1{font-size:1.3rem}form{display:grid;gap:10px;margin:16px 0;padding:16px;border:1px solid #d7dbe6;border-radius:12px}
button,input,select{font:inherit;padding:10px;border-radius:8px;border:1px solid #b9c0d4}button{background:#4f46e5;color:#fff;border:0;cursor:pointer}
.aviso{background:#fef3c7;padding:10px;border-radius:8px;font-size:.9rem}</style></head><body>${cuerpo}</body></html>`);
}

async function leerFormulario(req) {
  let texto = '';
  for await (const parte of req) texto += parte;
  return Object.fromEntries(new URLSearchParams(texto));
}

function validarPeticionAuth(p) {
  if (p.response_type !== 'code') return 'response_type debe ser code';
  if (!CLIENTES_PUBLICOS.includes(p.client_id)) return `cliente desconocido: ${p.client_id}`;
  if (!REDIRECCIONES.some((prefijo) => (p.redirect_uri ?? '').startsWith(prefijo + '/'))) return 'redirect_uri no permitido';
  if (!p.code_challenge || p.code_challenge_method !== 'S256') return 'se exige PKCE (S256)';
  return null;
}

function pantallaIngreso(res, p, error) {
  const ocultos = ['client_id', 'redirect_uri', 'response_type', 'scope', 'state', 'code_challenge', 'code_challenge_method', 'nonce']
    .map((k) => `<input type="hidden" name="${k}" value="${esc(p[k])}">`).join('');
  const atajos = USUARIOS.map((u, i) => `<form method="post" action="${BASE}/auth">${ocultos}
<input type="hidden" name="elegido" value="${i}"><button>Entrar como ${esc(u.nombre ?? u.usuario)} (${esc((u.roles ?? []).join(', '))})</button></form>`).join('');
  html(res, 200, `<h1>Keycloak simulado · AdOrbit</h1><p class="aviso">Solo desarrollo: no se valida ninguna contrasena.</p>
${error ? `<p class="aviso" role="alert">${esc(error)}</p>` : ''}${atajos}
<form method="post" action="${BASE}/auth">${ocultos}<strong>Otro usuario</strong>
<input name="usuario" placeholder="usuario" required><select name="rol"><option>cliente</option><option>ejecutivo</option><option>creativo</option><option>gerente</option></select>
<input name="cliente_id" placeholder="cliente_id (UUID, solo para el rol cliente)"><button>Entrar</button></form>`);
}

function emitirTokensDeUsuario(cliente, u, nonce) {
  const perfil = { name: u.nombre ?? u.usuario, preferred_username: u.usuario, ...(u.cliente_id ? { cliente_id: u.cliente_id } : {}) };
  const sub = `usuario-${u.usuario}`;
  const refresco = randomUUID();
  refrescos.set(refresco, { cliente, usuario: u, vence: Date.now() + DURACION_REFRESCO_S * 1000 });
  return {
    access_token: tokenAcceso({ sub, roles: u.roles ?? [], extra: { ...perfil, azp: cliente } }),
    id_token: firmar({ iss: EMISOR, aud: cliente, sub, iat: ahora(), exp: ahora() + DURACION_S, ...(nonce ? { nonce } : {}), ...perfil }),
    refresh_token: refresco, refresh_expires_in: DURACION_REFRESCO_S,
    token_type: 'Bearer', expires_in: DURACION_S, scope: 'openid profile',
  };
}

const servidor = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const ruta = url.pathname;

  if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); return res.end(); }

  if (req.method === 'GET' && ruta === '/realms/adorbit/.well-known/openid-configuration') {
    return json(res, 200, {
      issuer: EMISOR, authorization_endpoint: `${EMISOR}/protocol/openid-connect/auth`, token_endpoint: `${EMISOR}/protocol/openid-connect/token`,
      jwks_uri: `${EMISOR}/protocol/openid-connect/certs`, end_session_endpoint: `${EMISOR}/protocol/openid-connect/logout`,
      response_types_supported: ['code'], subject_types_supported: ['public'], id_token_signing_alg_values_supported: ['RS256'],
      code_challenge_methods_supported: ['S256'], grant_types_supported: ['authorization_code', 'refresh_token', 'client_credentials'], scopes_supported: ['openid', 'profile'],
    });
  }

  if (req.method === 'GET' && ruta === `${BASE}/certs`) return json(res, 200, { keys: [jwk] });

  if (ruta === `${BASE}/auth`) {
    const p = req.method === 'POST' ? await leerFormulario(req) : Object.fromEntries(url.searchParams);
    const error = validarPeticionAuth(p);
    if (error) return html(res, 400, `<h1>Peticion invalida</h1><p>${esc(error)}</p>`);
    if (req.method === 'GET') return pantallaIngreso(res, p);

    const usuario = p.elegido !== undefined ? USUARIOS[Number(p.elegido)]
      : { usuario: p.usuario?.trim(), nombre: p.usuario?.trim(), roles: [p.rol], cliente_id: p.cliente_id?.trim() || undefined };
    if (!usuario?.usuario) return pantallaIngreso(res, p, 'Usuario invalido');
    const codigo = randomUUID();
    codigos.set(codigo, { cliente: p.client_id, redirigir: p.redirect_uri, desafio: p.code_challenge, nonce: p.nonce, usuario });
    setTimeout(() => codigos.delete(codigo), 60_000).unref();
    const destino = new URL(p.redirect_uri);
    destino.searchParams.set('code', codigo);
    if (p.state) destino.searchParams.set('state', p.state);
    destino.searchParams.set('iss', EMISOR);
    res.writeHead(302, { Location: destino.toString() });
    return res.end();
  }

  if (req.method === 'POST' && ruta === `${BASE}/token`) {
    const f = await leerFormulario(req);

    if (f.grant_type === 'client_credentials') {
      const cliente = CLIENTES[f.client_id];
      if (!cliente || cliente.secret !== f.client_secret) return json(res, 401, { error: 'invalid_client', error_description: 'Credenciales invalidas' });
      return json(res, 200, { access_token: tokenAcceso({ sub: `service-account-${f.client_id}`, roles: cliente.roles }), token_type: 'Bearer', expires_in: DURACION_S });
    }

    if (f.grant_type === 'authorization_code') {
      const emitido = codigos.get(f.code);
      codigos.delete(f.code); // un solo uso
      const desafioCalculado = createHash('sha256').update(f.code_verifier ?? '').digest('base64url');
      if (!emitido || emitido.cliente !== f.client_id || emitido.redirigir !== f.redirect_uri || emitido.desafio !== desafioCalculado) {
        return json(res, 400, { error: 'invalid_grant', error_description: 'Codigo o verificador PKCE invalido' });
      }
      return json(res, 200, emitirTokensDeUsuario(f.client_id, emitido.usuario, emitido.nonce));
    }

    if (f.grant_type === 'refresh_token') {
      const previo = refrescos.get(f.refresh_token);
      refrescos.delete(f.refresh_token); // rotacion: cada refresh token sirve una sola vez
      if (!previo || previo.cliente !== f.client_id || previo.vence < Date.now()) {
        return json(res, 400, { error: 'invalid_grant', error_description: 'Refresh token invalido o vencido' });
      }
      return json(res, 200, emitirTokensDeUsuario(f.client_id, previo.usuario));
    }
    return json(res, 400, { error: 'unsupported_grant_type' });
  }

  if (req.method === 'GET' && ruta === `${BASE}/logout`) {
    const destino = url.searchParams.get('post_logout_redirect_uri');
    if (destino && REDIRECCIONES.some((prefijo) => destino.startsWith(prefijo))) { res.writeHead(302, { Location: destino }); return res.end(); }
    return html(res, 200, '<h1>Sesion cerrada</h1>');
  }

  // Solo desarrollo: token de un usuario cualquiera. GET /emitir?roles=cliente&cliente_id=<uuid>
  if (req.method === 'GET' && ruta === '/emitir') {
    const roles = (url.searchParams.get('roles') ?? 'ejecutivo').split(',');
    const extra = url.searchParams.get('cliente_id') ? { cliente_id: url.searchParams.get('cliente_id') } : {};
    return json(res, 200, { access_token: tokenAcceso({ sub: 'usuario-simulado', roles, extra }) });
  }

  if (ruta === '/salud') return json(res, 200, { estado: 'vivo' });
  return json(res, 404, { error: 'no_encontrado' });
});

servidor.listen(PUERTO, ESCUCHAR, () => console.log(`Keycloak simulado en http://${ESCUCHAR}:${PUERTO} (emisor ${EMISOR})`));

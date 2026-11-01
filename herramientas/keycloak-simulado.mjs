#!/usr/bin/env node
// Keycloak SIMULADO para desarrollo local (no es seguridad real). Sirve hasta que exista el realm de verdad
// (plataforma/keycloak). Emite JWT RS256 con la misma forma que Keycloak (realm_access.roles, aud, iss) y
// publica el JWKS, de modo que ms-facturacion y ms-clientes-crm los validan como si fueran reales.
//
//   node herramientas/keycloak-simulado.mjs            # escucha en :8180
//   curl -s -d grant_type=client_credentials -d client_id=n8n -d client_secret=secreto-local \
//        localhost:8180/realms/adorbit/protocol/openid-connect/token
//
// Variables: PUERTO (8180) · EMISOR (http://localhost:8180/realms/adorbit) · AUDIENCIAS (ms-facturacion,ms-clientes-crm)
//            CLIENTES (JSON: {"n8n":{"secret":"secreto-local","roles":["gerente"]}})
import { createServer } from 'node:http';
import { createSign, generateKeyPairSync, randomUUID } from 'node:crypto';

const PUERTO = Number(process.env.PUERTO ?? 8180);
const EMISOR = process.env.EMISOR ?? `http://localhost:${PUERTO}/realms/adorbit`;
const AUDIENCIAS = (process.env.AUDIENCIAS ?? 'ms-facturacion,ms-clientes-crm').split(',');
const CLIENTES = JSON.parse(process.env.CLIENTES ?? '{"n8n":{"secret":"secreto-local","roles":["gerente"]}}');
const DURACION_S = 300;

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'simulado-1', use: 'sig', alg: 'RS256' };

const b64 = (x) => Buffer.from(x).toString('base64url');

function firmar(claims) {
  const cabecera = b64(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: jwk.kid }));
  const carga = b64(JSON.stringify(claims));
  const firma = createSign('RSA-SHA256').update(`${cabecera}.${carga}`).sign(privateKey).toString('base64url');
  return `${cabecera}.${carga}.${firma}`;
}

function emitir({ sub, roles, extra = {} }) {
  const ahora = Math.floor(Date.now() / 1000);
  return firmar({
    iss: EMISOR, aud: AUDIENCIAS, sub, iat: ahora, exp: ahora + DURACION_S, jti: randomUUID(),
    realm_access: { roles }, ...extra,
  });
}

function json(res, estado, cuerpo) {
  res.writeHead(estado, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(cuerpo));
}

async function leerFormulario(req) {
  let texto = '';
  for await (const parte of req) texto += parte;
  return Object.fromEntries(new URLSearchParams(texto));
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const base = '/realms/adorbit/protocol/openid-connect';

  if (req.method === 'GET' && url.pathname === `${base}/certs`) return json(res, 200, { keys: [jwk] });

  if (req.method === 'POST' && url.pathname === `${base}/token`) {
    const f = await leerFormulario(req);
    const cliente = CLIENTES[f.client_id];
    if (f.grant_type !== 'client_credentials' || !cliente || cliente.secret !== f.client_secret) {
      return json(res, 401, { error: 'invalid_client', error_description: 'Credenciales invalidas' });
    }
    const token = emitir({ sub: `service-account-${f.client_id}`, roles: cliente.roles });
    return json(res, 200, { access_token: token, token_type: 'Bearer', expires_in: DURACION_S });
  }

  // Solo desarrollo: token de un usuario cualquiera. GET /emitir?roles=cliente&cliente_id=<uuid>
  if (req.method === 'GET' && url.pathname === '/emitir') {
    const roles = (url.searchParams.get('roles') ?? 'ejecutivo').split(',');
    const extra = url.searchParams.get('cliente_id') ? { cliente_id: url.searchParams.get('cliente_id') } : {};
    return json(res, 200, { access_token: emitir({ sub: 'usuario-simulado', roles, extra }) });
  }

  if (url.pathname === '/salud') return json(res, 200, { estado: 'vivo' });
  return json(res, 404, { error: 'no_encontrado' });
}).listen(PUERTO, () => console.log(`Keycloak simulado en :${PUERTO} (emisor ${EMISOR})`));

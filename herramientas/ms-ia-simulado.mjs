#!/usr/bin/env node
// ms-ia SIMULADO (solo desarrollo): implementa la propuesta de contratos/openapi/ms-ia.yaml para que el panel de
// inteligencia se pueda desarrollar y probar sin esperar a ms-ia (Integrante C). NO usa IA ni datos reales:
// interpreta la pregunta con reglas y la mapea a una herramienta MCP parametrizada sobre datos de ejemplo.
//
//   node herramientas/ms-ia-simulado.mjs           # http://127.0.0.1:8085
//
// Respeta las reglas del MCP: jamas se ejecuta texto libre; un intento tipo SQL responde 403 `consulta_bloqueada` y
// queda en el registro de auditoria (consola). Valida el JWT contra el JWKS del Keycloak (real o simulado).
// Variables: PUERTO (8085) · ESCUCHAR (127.0.0.1) · JWKS_URI · EMISOR · AUDIENCIA (ms-ia) · CORS_ORIGENES
import { createHash, createPublicKey, randomUUID, verify } from 'node:crypto';
import { createServer } from 'node:http';
import { crc32 } from 'node:zlib';

const PUERTO = Number(process.env.PUERTO ?? 8085);
const ESCUCHAR = process.env.ESCUCHAR ?? '127.0.0.1';
const JWKS_URI = process.env.JWKS_URI ?? 'http://localhost:8180/realms/adorbit/protocol/openid-connect/certs';
const EMISOR = process.env.EMISOR ?? 'http://localhost:8180/realms/adorbit';
const AUDIENCIA = process.env.AUDIENCIA ?? 'ms-ia';
const ORIGENES = (process.env.CORS_ORIGENES ?? 'http://localhost:5174,http://localhost:4174,http://localhost:5180').split(',');
const ROLES_PERMITIDOS = ['gerente', 'ejecutivo'];

// ------------------------------------------------------------------ datos de ejemplo (solo para la simulacion)
const CAMPANAS = [
  { nombre: 'Verano 2027', cliente: 'Distribuidora Sol SRL', estado: 'activa', presupuesto: 48000, gasto: 31250 },
  { nombre: 'Lanzamiento Café Andino', cliente: 'Café Andino SA', estado: 'activa', presupuesto: 30000, gasto: 12400.5 },
  { nombre: 'Navidad 2026', cliente: 'Distribuidora Sol SRL', estado: 'activa', presupuesto: 80000, gasto: 5200 },
  { nombre: 'Black Friday', cliente: 'Electro Hogar', estado: 'pausada', presupuesto: 60000, gasto: 18500 },
  { nombre: 'Día de la Madre', cliente: 'Supermercados Norte', estado: 'finalizada', presupuesto: 22000, gasto: 21890 },
  { nombre: 'Vuelta a clases', cliente: 'Librería Universo', estado: 'finalizada', presupuesto: 15000, gasto: 14200 },
];
const FACTURAS = [
  { cliente: 'Distribuidora Sol SRL', saldo: 8588, dias: 3 },
  { cliente: 'Distribuidora Sol SRL', saldo: 4746, dias: 12 },
  { cliente: 'Electro Hogar', saldo: 15600, dias: 6 },
  { cliente: 'Café Andino SA', saldo: 3100.5, dias: 20 },
  { cliente: 'Supermercados Norte', saldo: 9200, dias: 45 },
  { cliente: 'Librería Universo', saldo: 1800, dias: 2 },
];
const MOROSOS = [
  { cliente: 'Constructora Altiplano', facturas: 3, saldo: 24500, mora: 48 },
  { cliente: 'Farmacias Vida', facturas: 2, saldo: 11800.75, mora: 33 },
  { cliente: 'Transportes Oriente', facturas: 1, saldo: 6400, mora: 17 },
  { cliente: 'Hotel Los Tajibos Sur', facturas: 4, saldo: 18950, mora: 61 },
];
const MESES = ['Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov'];
const dinero = (n) => n.toFixed(2);
const sinTildes = (t) => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

const SUGERENCIAS = [
  '¿Cuánto gastó la campaña Verano 2027 por mes?',
  'Facturas que vencen en los próximos 30 días',
  'Clientes morosos',
  'Campañas activas',
];

// ------------------------------------------------------------------ interpretacion -> herramienta MCP
const PATRON_BLOQUEO = /(;|--|\/\*|\b(drop|delete|insert|update|truncate|alter|union|select|exec|grant)\b)/i;

function interpretar(pregunta) {
  const t = sinTildes(pregunta);
  if (/moros|\bmora\b|deudor|impag/.test(t)) return { herramienta: 'clientes_morosos', parametros: {} };
  if (/venc(e|en|er|imient)|por cobrar|cobranza/.test(t)) {
    const n = Number((t.match(/(\d{1,3})\s*(dias?|d\b)/) ?? t.match(/(\d{1,3})/) ?? [])[1] ?? 30);
    return { herramienta: 'facturas_por_vencer', parametros: { dias: Math.min(Math.max(n, 1), 365) } };
  }
  const campana = CAMPANAS.find((c) => t.includes(sinTildes(c.nombre)));
  if (campana && /gasto|ejecucion|consumo|inversion|mes/.test(t)) {
    return { herramienta: 'resumen_gasto_campana', parametros: { campana: campana.nombre } };
  }
  if (/campa|gasto|presupuesto/.test(t)) {
    const estado = ['activa', 'pausada', 'finalizada'].find((e) => t.includes(e.slice(0, -1)));
    return { herramienta: 'consultar_campanas', parametros: estado ? { estado } : {} };
  }
  return null;
}

const bob = (clave, etiqueta) => ({ clave, etiqueta, tipo: 'dinero', moneda: 'BOB' });

function ejecutar({ herramienta, parametros }) {
  switch (herramienta) {
    case 'consultar_campanas': {
      const lista = CAMPANAS.filter((c) => !parametros.estado || c.estado === parametros.estado);
      const pres = lista.reduce((s, c) => s + c.presupuesto, 0);
      const gasto = lista.reduce((s, c) => s + c.gasto, 0);
      return {
        titulo: parametros.estado ? `Campañas ${parametros.estado}s` : 'Campañas: presupuesto y gasto',
        columnas: [
          { clave: 'nombre', etiqueta: 'Campaña', tipo: 'texto' }, { clave: 'cliente', etiqueta: 'Cliente', tipo: 'texto' },
          { clave: 'estado', etiqueta: 'Estado', tipo: 'texto' }, bob('presupuesto', 'Presupuesto'), bob('gasto', 'Gasto'),
          { clave: 'ejecucion', etiqueta: 'Ejecución', tipo: 'porcentaje' },
        ],
        filas: lista.map((c) => ({ ...c, presupuesto: dinero(c.presupuesto), gasto: dinero(c.gasto), ejecucion: ((c.gasto / c.presupuesto) * 100).toFixed(1) })),
        indicadores: [
          { etiqueta: 'Presupuesto total', valor: dinero(pres), tipo: 'dinero', moneda: 'BOB' },
          { etiqueta: 'Gasto total', valor: dinero(gasto), tipo: 'dinero', moneda: 'BOB' },
          { etiqueta: 'Ejecución', valor: pres ? ((gasto / pres) * 100).toFixed(1) : '0.0', tipo: 'porcentaje' },
        ],
        grafico: lista.length > 1 ? { tipo: 'barras', x: 'nombre', y: 'gasto' } : null,
      };
    }
    case 'facturas_por_vencer': {
      const lista = FACTURAS.filter((f) => f.dias <= parametros.dias);
      const porCliente = new Map();
      for (const f of lista) {
        const a = porCliente.get(f.cliente) ?? { cliente: f.cliente, facturas: 0, saldo: 0, proximo: 999 };
        a.facturas += 1; a.saldo += f.saldo; a.proximo = Math.min(a.proximo, f.dias);
        porCliente.set(f.cliente, a);
      }
      const filas = [...porCliente.values()].sort((a, b) => b.saldo - a.saldo).map((a) => ({
        cliente: a.cliente, facturas: a.facturas, saldo: dinero(a.saldo),
        proximo_vencimiento: new Date(Date.now() + a.proximo * 86400000).toISOString().slice(0, 10),
      }));
      const total = lista.reduce((s, f) => s + f.saldo, 0);
      return {
        titulo: `Facturas por vencer en ${parametros.dias} días`,
        columnas: [
          { clave: 'cliente', etiqueta: 'Cliente', tipo: 'texto' }, { clave: 'facturas', etiqueta: 'Facturas', tipo: 'numero' },
          bob('saldo', 'Saldo por cobrar'), { clave: 'proximo_vencimiento', etiqueta: 'Primer vencimiento', tipo: 'fecha' },
        ],
        filas,
        indicadores: [
          { etiqueta: 'Por cobrar', valor: dinero(total), tipo: 'dinero', moneda: 'BOB' },
          { etiqueta: 'Facturas', valor: String(lista.length), tipo: 'numero' },
        ],
        grafico: filas.length > 1 ? { tipo: 'barras', x: 'cliente', y: 'saldo' } : null,
      };
    }
    case 'clientes_morosos': {
      const filas = [...MOROSOS].sort((a, b) => b.saldo - a.saldo).map((m) => ({
        cliente: m.cliente, facturas_vencidas: m.facturas, saldo_vencido: dinero(m.saldo), dias_mora: m.mora,
      }));
      return {
        titulo: 'Clientes con facturas vencidas',
        columnas: [
          { clave: 'cliente', etiqueta: 'Cliente', tipo: 'texto' }, { clave: 'facturas_vencidas', etiqueta: 'Facturas vencidas', tipo: 'numero' },
          bob('saldo_vencido', 'Saldo vencido'), { clave: 'dias_mora', etiqueta: 'Días de mora', tipo: 'numero' },
        ],
        filas,
        indicadores: [
          { etiqueta: 'Saldo vencido', valor: dinero(MOROSOS.reduce((s, m) => s + m.saldo, 0)), tipo: 'dinero', moneda: 'BOB' },
          { etiqueta: 'Clientes en mora', valor: String(MOROSOS.length), tipo: 'numero' },
        ],
        grafico: { tipo: 'barras', x: 'cliente', y: 'saldo_vencido' },
      };
    }
    case 'resumen_gasto_campana': {
      const c = CAMPANAS.find((x) => x.nombre === parametros.campana);
      const pesos = [0.08, 0.12, 0.17, 0.2, 0.22, 0.21];
      const hoy = new Date();
      const filas = pesos.map((p, i) => ({
        mes: new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - (5 - i), 1)).toISOString().slice(0, 10),
        gasto: dinero(c.gasto * p),
      }));
      return {
        titulo: `Gasto mensual · ${c.nombre}`,
        columnas: [{ clave: 'mes', etiqueta: 'Mes', tipo: 'fecha' }, bob('gasto', 'Gasto')],
        filas,
        indicadores: [
          { etiqueta: 'Gasto acumulado', valor: dinero(c.gasto), tipo: 'dinero', moneda: 'BOB' },
          { etiqueta: 'Presupuesto', valor: dinero(c.presupuesto), tipo: 'dinero', moneda: 'BOB' },
          { etiqueta: 'Ejecución', valor: ((c.gasto / c.presupuesto) * 100).toFixed(1), tipo: 'porcentaje' },
        ],
        grafico: { tipo: 'linea', x: 'mes', y: 'gasto' },
      };
    }
    default:
      throw new Error('herramienta desconocida');
  }
}
void MESES;

// ------------------------------------------------------------------ seguridad (JWT) y utilidades HTTP
let jwks = { claves: [], pedidoEn: 0 };
async function claveParaKid(kid) {
  const buscar = () => jwks.claves.find((k) => k.kid === kid);
  if (!buscar() && Date.now() - jwks.pedidoEn > 30_000) {
    const r = await fetch(JWKS_URI);
    jwks = { claves: (await r.json()).keys ?? [], pedidoEn: Date.now() };
  }
  return buscar();
}

async function autenticar(req) {
  const cabecera = req.headers.authorization ?? '';
  if (!cabecera.startsWith('Bearer ')) return { error: [401, 'no_autenticado', 'Falta el token Bearer'] };
  const [h, p, f] = cabecera.slice(7).split('.');
  try {
    const cab = JSON.parse(Buffer.from(h, 'base64url').toString());
    const jwk = await claveParaKid(cab.kid);
    const valido = jwk && verify('RSA-SHA256', Buffer.from(`${h}.${p}`), createPublicKey({ key: jwk, format: 'jwk' }), Buffer.from(f, 'base64url'));
    const c = JSON.parse(Buffer.from(p, 'base64url').toString());
    const ahora = Date.now() / 1000;
    if (!valido || c.exp < ahora || c.iss !== EMISOR || !([].concat(c.aud)).includes(AUDIENCIA)) throw new Error('token invalido');
    const roles = c.realm_access?.roles ?? [];
    if (!roles.some((r) => ROLES_PERMITIDOS.includes(r))) return { error: [403, 'sin_permiso', 'No tiene permiso para los reportes'] };
    return { claims: c };
  } catch {
    return { error: [401, 'no_autenticado', 'Token invalido o vencido'] };
  }
}

function cabecerasCors(req, res) {
  const origen = req.headers.origin;
  if (origen && ORIGENES.includes(origen)) {
    res.setHeader('Access-Control-Allow-Origin', origen);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Idempotency-Key, X-Correlation-Id, Accept');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Correlation-Id');
  }
}

function json(res, estado, cuerpo) {
  res.writeHead(estado, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(cuerpo));
}
const error = (res, estado, codigo, mensaje, detalle = null) => json(res, estado, { codigo, mensaje, detalle });

async function cuerpoJson(req) {
  let texto = '';
  for await (const parte of req) { texto += parte; if (texto.length > 10_000) throw new Error('grande'); }
  return JSON.parse(texto || '{}');
}

// ------------------------------------------------------------------ exportacion: PDF y XLSX minimos pero validos
function textoCelda(c, valor) {
  if (valor === undefined || valor === null) return '';
  if (c.tipo === 'dinero') return `${c.moneda === 'USD' ? 'US$' : 'Bs'} ${Number(valor).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (c.tipo === 'porcentaje') return `${valor}%`;
  return String(valor);
}

function generarPdf(reporte) {
  const filasTexto = reporte.filas.map((f) => reporte.columnas.map((c) => textoCelda(c, f[c.clave])));
  const anchos = reporte.columnas.map((c, i) => Math.min(24, Math.max(c.etiqueta.length, ...filasTexto.map((f) => f[i].length))));
  const fila = (celdas) => celdas.map((t, i) => (reporte.columnas[i].tipo === 'texto' ? t.slice(0, anchos[i]).padEnd(anchos[i]) : t.slice(0, anchos[i]).padStart(anchos[i]))).join('  ');
  const lineas = [reporte.titulo, `Pregunta: ${reporte.pregunta}`, `Generado: ${reporte.generado_en}`, '', fila(reporte.columnas.map((c) => c.etiqueta)), '-'.repeat(Math.min(95, anchos.reduce((a, b) => a + b + 2, -2))), ...filasTexto.map(fila)];
  const POR_PAGINA = 52;
  const paginas = [];
  for (let i = 0; i < lineas.length; i += POR_PAGINA) paginas.push(lineas.slice(i, i + POR_PAGINA));
  const esc = (t) => t.replace(/[\\()]/g, '\\$&');
  const objetos = []; // 1 catalogo, 2 paginas, 3 fuente, luego (pagina, contenido)*
  const ids = paginas.map((_, i) => 4 + i * 2);
  objetos[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objetos[2] = `<< /Type /Pages /Kids [${ids.map((i) => `${i} 0 R`).join(' ')}] /Count ${paginas.length} >>`;
  objetos[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>';
  paginas.forEach((ls, i) => {
    const flujo = `BT /F1 8.5 Tf 11 TL 36 806 Td ${ls.map((l) => `(${esc(l)}) '`).join(' ')} ET`;
    objetos[ids[i]] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${ids[i] + 1} 0 R >>`;
    objetos[ids[i] + 1] = { flujo };
  });
  const partes = [Buffer.from('%PDF-1.4\n')];
  const desplazamientos = [];
  let largo = partes[0].length;
  for (let n = 1; n < objetos.length; n++) {
    const o = objetos[n];
    const cuerpo = typeof o === 'string' ? o : `<< /Length ${Buffer.byteLength(o.flujo, 'latin1')} >>\nstream\n${o.flujo}\nendstream`;
    const b = Buffer.from(`${n} 0 obj\n${cuerpo}\nendobj\n`, 'latin1');
    desplazamientos[n] = largo; partes.push(b); largo += b.length;
  }
  const xref = `xref\n0 ${objetos.length}\n0000000000 65535 f \n${desplazamientos.slice(1).map((d) => `${String(d).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objetos.length} /Root 1 0 R >>\nstartxref\n${largo}\n%%EOF\n`;
  partes.push(Buffer.from(xref));
  return Buffer.concat(partes);
}

function zipSinCompresion(archivos) {
  const locales = []; const centrales = []; let desplazamiento = 0;
  for (const [nombre, datos] of archivos) {
    const n = Buffer.from(nombre); const d = Buffer.from(datos); const c = crc32(d);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt32LE(c, 14);
    local.writeUInt32LE(d.length, 18); local.writeUInt32LE(d.length, 22); local.writeUInt16LE(n.length, 26);
    const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
    central.writeUInt32LE(c, 16); central.writeUInt32LE(d.length, 20); central.writeUInt32LE(d.length, 24); central.writeUInt16LE(n.length, 28);
    central.writeUInt32LE(desplazamiento, 42);
    locales.push(local, n, d); centrales.push(central, n);
    desplazamiento += 30 + n.length + d.length;
  }
  const dc = Buffer.concat(centrales);
  const fin = Buffer.alloc(22); fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(archivos.length, 8); fin.writeUInt16LE(archivos.length, 10);
  fin.writeUInt32LE(dc.length, 12); fin.writeUInt32LE(desplazamiento, 16);
  return Buffer.concat([...locales, dc, fin]);
}

function generarXlsx(reporte) {
  const xml = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const letra = (i) => String.fromCharCode(65 + i);
  const celda = (c, v, fila, i) => {
    const ref = `${letra(i)}${fila}`;
    if (['numero', 'dinero', 'porcentaje'].includes(c.tipo) && v !== undefined) return `<c r="${ref}"><v>${Number(v)}</v></c>`;
    return `<c r="${ref}" t="inlineStr"><is><t>${xml(v ?? '')}</t></is></c>`;
  };
  const cabecera = `<row r="1">${reporte.columnas.map((c, i) => `<c r="${letra(i)}1" t="inlineStr"><is><t>${xml(c.etiqueta + (c.tipo === 'dinero' ? ` (${c.moneda})` : ''))}</t></is></c>`).join('')}</row>`;
  const filas = reporte.filas.map((f, r) => `<row r="${r + 2}">${reporte.columnas.map((c, i) => celda(c, f[c.clave], r + 2, i)).join('')}</row>`).join('');
  return zipSinCompresion([
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Reporte" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'],
    ['xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${cabecera}${filas}</sheetData></worksheet>`],
  ]);
}

// ------------------------------------------------------------------ servidor
const reportes = new Map();
const claves = new Map(); // Idempotency-Key -> { huella, id }
const auditoria = [];

const servidor = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  cabecerasCors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (url.pathname === '/salud') return json(res, 200, { estado: 'vivo' });

  const auth = await autenticar(req);
  if (auth.error) return error(res, ...auth.error);

  try {
    if (req.method === 'POST' && url.pathname === '/api/v1/reportes') {
      const clave = req.headers['idempotency-key'];
      if (!clave || clave.length < 8 || clave.length > 120) return error(res, 400, 'clave_idempotencia_invalida', 'La cabecera Idempotency-Key debe tener 8 a 120 caracteres');
      const cuerpo = await cuerpoJson(req);
      const campos = Object.keys(cuerpo);
      const pregunta = typeof cuerpo.pregunta === 'string' ? cuerpo.pregunta.trim() : '';
      if (campos.some((k) => k !== 'pregunta') || pregunta.length < 3 || pregunta.length > 500) {
        return error(res, 400, 'solicitud_invalida', 'La pregunta debe tener entre 3 y 500 caracteres', { pregunta: 'invalida' });
      }
      const huella = createHash('sha256').update(pregunta).digest('hex');
      const previa = claves.get(clave);
      if (previa) {
        if (previa.huella !== huella) return error(res, 422, 'idempotencia_conflicto', 'La clave de idempotencia ya se uso con otra pregunta');
        return json(res, 200, reportes.get(previa.id));
      }
      if (PATRON_BLOQUEO.test(pregunta)) {
        auditoria.push({ en: new Date().toISOString(), sub: auth.claims.sub, pregunta, bloqueado: true });
        console.warn(`[auditoria_mcp] BLOQUEADO usuario=${auth.claims.sub} pregunta=${JSON.stringify(pregunta)}`);
        return error(res, 403, 'consulta_bloqueada', 'La pregunta contiene instrucciones que la política de consultas no permite. No se ejecutó nada.');
      }
      const interpretacion = interpretar(pregunta);
      if (!interpretacion) {
        return error(res, 422, 'pregunta_no_entendida', 'No pude relacionar la pregunta con un reporte disponible.', { sugerencias: SUGERENCIAS });
      }
      auditoria.push({ en: new Date().toISOString(), sub: auth.claims.sub, herramienta: interpretacion.herramienta, parametros: interpretacion.parametros, bloqueado: false });
      const reporte = { id: randomUUID(), pregunta, generado_en: new Date().toISOString(), interpretacion, advertencias: [], ...ejecutar(interpretacion) };
      reportes.set(reporte.id, reporte);
      claves.set(clave, { huella, id: reporte.id });
      return json(res, 201, reporte);
    }

    const coincide = url.pathname.match(/^\/api\/v1\/reportes\/([0-9a-f-]{36})(\/exportar)?$/);
    if (req.method === 'GET' && coincide) {
      const reporte = reportes.get(coincide[1]);
      if (!reporte) return error(res, 404, 'no_encontrado', 'No existe el reporte');
      if (!coincide[2]) return json(res, 200, reporte);
      const formato = url.searchParams.get('formato');
      if (!['pdf', 'xlsx'].includes(formato)) return error(res, 400, 'formato_invalido', 'formato debe ser pdf o xlsx');
      const nombre = `reporte-${reporte.titulo.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.${formato}`;
      const tipo = formato === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const archivo = formato === 'pdf' ? generarPdf(reporte) : generarXlsx(reporte);
      res.writeHead(200, { 'Content-Type': tipo, 'Content-Length': archivo.length, 'Content-Disposition': `attachment; filename="${nombre}"` });
      return res.end(archivo);
    }
    return error(res, 404, 'no_encontrado', 'Ruta no encontrada');
  } catch (e) {
    console.error(e);
    return error(res, 400, 'solicitud_invalida', 'No se pudo leer la solicitud');
  }
});

servidor.listen(PUERTO, ESCUCHAR, () => console.log(`ms-ia simulado en http://${ESCUCHAR}:${PUERTO} (JWKS ${JWKS_URI})`));

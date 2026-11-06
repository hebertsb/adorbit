# panel-inteligencia

> React 19 · TypeScript · Vite · Module Federation · REST (ms-ia) · Responsable: Integrante B

Panel de **BI para gerencia**: se escribe (o dicta) una pregunta en lenguaje natural y ms-ia devuelve un **reporte** con
indicadores, un gráfico, la tabla de datos y la **consulta exacta** que se ejecutó (herramienta MCP + parámetros). Se
exporta a **PDF** o **Excel**. Funciona de dos maneras con el mismo código:

1. **Remoto del portal de gestión** (Module Federation): el contenedor Angular (Integrante A) lo carga y lo monta.
2. **Aplicación independiente**: con su propio login OIDC (útil para desarrollo y para demostrar sin el portal).

## Contrato con el contenedor (Integrante A)

El remoto `panel_inteligencia` publica `remoteEntry.js` y expone **`./montar`**. No depende del framework del
anfitrión: recibe un elemento del DOM y un contexto, y pinta adentro (en un **Shadow DOM**: sus estilos no se filtran al
contenedor ni al revés). React va empaquetado en el remoto; el anfitrión no necesita compartir nada.

```ts
interface ContextoPanel {
  apiIaUrl: string; // ms-ia o el gateway, sin barra final
  obtenerToken: () => Promise<string>; // token vigente del usuario; debe lanzar si no hay sesión
  alExpirarSesion?: () => void; // el panel lo llama ante un 401
  usuario?: { nombre?: string };
  tema?: 'claro' | 'oscuro' | 'sistema'; // por defecto sigue el del sistema
}
const panel = montarPanel(elemento, contexto); // -> { desmontar(), actualizarContexto(parcial) }
```

Con Module Federation 2 (`@module-federation/enhanced`) o con el contenedor estándar (`init` / `get`):

```ts
const contenedor = await import(/* @vite-ignore */ `${URL_REMOTO}/remoteEntry.js`);
await contenedor.init({});
const { montarPanel } = await (await contenedor.get('./montar'))();
const panel = montarPanel(document.querySelector('#destino')!, { apiIaUrl, obtenerToken });
// al destruir la ruta del anfitrión:  panel.desmontar();
```

`anfitrion-prueba/index.html` es un anfitrión mínimo que hace exactamente esto desde **otro origen**; sirve para
verificar la integración (y como ejemplo para Angular) sin tener el portal real.
**No está probado dentro de un Angular real** (el contenedor aún no existe): si el contenedor usa _Native Federation_
en vez de Module Federation, basta empaquetar `src/montar.tsx` con ese mecanismo; el contrato `montarPanel` no cambia.
Servir `remoteEntry.js` y `/assets/` con CORS (el `nginx.conf` ya lo hace).

## Seguridad y reglas del proyecto

- **Nunca se escribe SQL ni se ejecuta texto libre**: la pregunta la interpreta ms-ia a una herramienta MCP parametrizada
  (`consultar_campanas`, `facturas_por_vencer`, `clientes_morosos`, `resumen_gasto_campana`), solo lectura. El panel
  **muestra** la herramienta y los parámetros usados, y un intento bloqueado (`consulta_bloqueada`) se explica y queda
  auditado por ms-ia.
- El panel **no guarda credenciales**: le pide el token al anfitrión en cada llamada. Los reportes de la sesión viven
  **solo en memoria** (no se guardan datos del negocio en el navegador).
- Las etiquetas y valores que llegan de la API se insertan como **texto** (React), nunca como HTML.
- Cada pregunta lleva su `Idempotency-Key`; el dinero viaja y se muestra como texto decimal (sin `float`).

## Visualización (guía de dataviz del proyecto)

Un solo color (azul, slot 1 de la paleta validada: pasa los controles de luminosidad, croma y contraste en claro y
oscuro); barras horizontales de **20 px** con extremo de datos redondeado a 4 px y base recta, valor en la punta (dentro
solo si cabe), rejilla de 1 px; línea de 2 px con área al 10 %, punto final con anillo de 2 px y valor; **no se grafica
una sola barra ni un solo punto** (esa cifra ya sale en los indicadores); máximo 12 barras (el resto, en la tabla);
tooltip con el valor primero, por puntero **y por teclado** (foco en cada barra; flechas en la línea); **la tabla
siempre acompaña al gráfico**; texto siempre en tokens de texto, nunca en el color de la serie; tema claro/oscuro;
`forced-colors` contemplado. El diseño responde al **ancho del panel** (container queries), no al de la ventana: dentro
del portal puede ser una columna estrecha.

## Voz

El botón «Dictar» usa la API de voz del navegador (`es-BO`) y pide reconocimiento **local** (`processLocally`) cuando el
navegador lo soporta; si no, el navegador puede enviar el audio a su proveedor. La interfaz lo avisa. Alternativa 100 %
local (Whisper en el navegador) queda como mejora (regla 10 del proyecto).

## ms-ia (propuesta de contrato)

El panel consume `POST /api/v1/reportes`, `GET /api/v1/reportes/{id}` y `GET /api/v1/reportes/{id}/exportar?formato=pdf|xlsx`
según **`contratos/openapi/ms-ia.yaml`**, que es una **propuesta del Integrante B pendiente de confirmar por el Integrante C**.
Hasta que exista ms-ia, `herramientas/ms-ia-simulado.mjs` implementa ese contrato (reglas fijas, datos de ejemplo, PDF y
Excel reales, auditoría en consola); **no usa IA**.
Requisitos para Keycloak (A): cliente OIDC **público** `panel-inteligencia` (PKCE `S256`, redirect `…/autenticado`), roles
`gerente`/`ejecutivo` y la audiencia `ms-ia`.

## Desarrollo

```bash
npm ci
cp .env.ejemplo .env.local                   # VITE_OIDC_AUTORIDAD, VITE_OIDC_CLIENTE_ID, VITE_API_IA_URL
npm run dev                                   # http://localhost:5174 (remoto + modo independiente)
npm run build && npm run preview              # http://localhost:4174 (con remoteEntry.js)
npm test                                      # Vitest + Testing Library (38 pruebas)
npm run lint && npm run formato:revisar && npx tsc --noEmit
```

Entorno de demostración completo (sin Keycloak ni ms-ia reales):

```bash
USUARIOS='[{"usuario":"gerente","nombre":"Gerencia","roles":["gerente"]}]' node herramientas/keycloak-simulado.mjs &
node herramientas/ms-ia-simulado.mjs &
npm run build && npm run preview &            # modo independiente en :4174
(cd anfitrion-prueba && python3 -m http.server 5180 --bind 127.0.0.1) &   # anfitrión simulado en :5180
```

Contenedor: `docker build --build-arg VITE_OIDC_AUTORIDAD=… --build-arg VITE_API_IA_URL=… -t adorbit-panel-inteligencia .`
(nginx sin privilegios, `/salud`, CORS en `remoteEntry.js`).

## Estructura

`src/montar.tsx` (punto de entrada del remoto) · `src/main.tsx` (modo independiente + OIDC) · `src/contexto.ts` (contrato) ·
`src/api` (cliente de ms-ia y tipos) · `src/componentes` (panel, formulario, resultado, gráficos, tabla, historial) ·
`src/utilidades` (escalas, dinero, fechas, dictado) · `src/estilos/panel.css`. Los _hooks_ se llaman `useXxx` porque React y
su linter lo exigen; el resto va en español.

## Pendiente

- Confirmar con C el contrato de reportes y las herramientas MCP reales (hoy son las del simulador).
- Probarlo dentro del contenedor Angular real de A.
- Verificar el dictado por voz en un Chrome real (el panel de pruebas usado solo ejercita el código con un doble).
- Reportes de ms-ia con más de una serie (hoy: una medida por gráfico).

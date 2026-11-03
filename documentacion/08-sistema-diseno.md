# 08 · Sistema de diseño

> Documento vivo, igual que los demás de `documentacion/`. Nace de auditar el CSS real que Luis
> ya escribió en `aplicaciones/portal-cliente/src/estilos/global.css` y
> `aplicaciones/panel-inteligencia/src/estilos/panel.css` (rama `feat/ms-facturacion-base`), no de
> inventar una paleta desde cero. Objetivo: que portal-gestión (Angular), portal-cliente +
> panel-inteligencia (React) y la app móvil (Flutter) se vean como un mismo producto.

## Qué se encontró al auditar

Las dos hojas de estilo de Luis **coinciden en lo importante** (color de marca `#4f46e5`, botones
con `min-height: 44px`, radio de 14px en tarjetas, el mismo patrón de foco accesible, mobile-first
con los mismos puntos de quiebre) — buena señal, no partían de cero. Pero divergen en el detalle:

| Concepto | `global.css` (portal-cliente) | `panel.css` (panel-inteligencia) |
|---|---|---|
| Fondo de página | `--fondo` | `--plano` |
| Texto (niveles) | `--texto` / `--texto-suave` (2 niveles) | `--tinta` / `--tinta-2` / `--tinta-3` (3 niveles) |
| Borde | hex sólido por tema (`#e3e6ee` / `#2a3049`) | `rgb(11 11 11 / 10%)` traslúcido |
| Colores de estado | `ok/aviso/peligro/info/neutro` completos | solo `aviso/peligro` |

Ninguna de las dos está "mal" — `panel-inteligencia` se inyecta en un Shadow DOM aislado a
propósito y necesita tonos extra para gráficos (`--rejilla`, `--eje`, `--serie-1`). Pero sin un
vocabulario común, Roly no tiene de dónde partir para el Angular y cada app termina con su propio
sistema. Esto **no bloquea** lo que ya está construido — no hace falta tocar el código de Luis
ahora — pero sí es la base para todo lo nuevo (Angular, Flutter, y para cuando haya tiempo de
reconciliar las dos hojas existentes).

## Los tokens

Viven en `documentacion/diseno/tokens.css` (CSS custom properties, prefijo `--ao-` para no chocar
con variables locales) y `documentacion/diseno/tokens.json` (misma info en JSON, para quien no
pueda consumir CSS directo, como Flutter). Resumen:

- **Superficies** (3 niveles): `fondo` (página) → `plano` (hundida: inputs, chips) → `superficie`
  (elevada: tarjetas, barras).
- **Texto** (3 niveles): `texto` → `texto-suave` → `texto-tenue`.
- **Marca**: `marca` / `marca-oscura` / `marca-suave` — el morado-índigo `#4f46e5` que ya usan las
  dos apps de Luis, queda oficial.
- **Estado**: `ok` / `aviso` / `peligro` / `info` / `neutro`, cada uno con su `-fondo` a juego.
- **Gráficos**: `rejilla` / `eje` / `serie-1` / `serie-2`, para `panel-inteligencia` y cualquier
  otro reporte.
- **Radio**: `chico` (6px, anillo de foco) · `normal` (10px, botones/inputs) · `grande` (14px,
  tarjetas) · `pastilla` (999px, chips/etiquetas).
- **Espaciado**: escala de 4px (`4·8·12·16·24·32·48`).
- **Objetivo táctil**: 44px mínimo en todo elemento tocable (ya lo respetan ambas apps de Luis).
- **Breakpoints**: 360 (base) · 480 · 720 · 900 · 1400 — cumple la regla de `CLAUDE.md` de probar
  de 360 a 1920px sin scroll horizontal.
- Modo oscuro vía `prefers-color-scheme` — ya viene gratis porque las dos hojas auditadas lo tenían
  resuelto; no es un requisito del docente, pero no cuesta nada mantenerlo.

## Cómo lo usa cada app

**React (portal-cliente, panel-inteligencia):** ya casi lo cumplen. No hace falta reescribir nada
ahora; cuando haya tiempo, renombrar sus variables locales al prefijo `--ao-*` para que coincidan
exactamente con este archivo (ver tabla de arriba).

**Angular (portal-gestión, modulo-campanas):** importar `documentacion/diseno/tokens.css` en los
estilos globales (`styles.scss`) del shell. Son custom properties CSS estándar, funcionan igual que
en React — cada componente Angular las consume con `var(--ao-marca)`, etc.

**Flutter (app-movil):** CSS no aplica; mapear `tokens.json` a un `ThemeData`/`ColorScheme` de
Flutter (hex directo, incluyendo el bloque `oscuro` para el tema oscuro del sistema).

## Vista previa

Componentes base (botones, inputs, tarjetas, estados de formulario, un login de ejemplo) armados
con estos tokens: ver el artifact publicado (enlace en el mensaje donde se generó este documento).

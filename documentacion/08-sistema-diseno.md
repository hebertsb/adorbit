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

## Modo claro/oscuro y acento en una sola variable

Además de `prefers-color-scheme` (automático, sigue el sistema), se puede dar al usuario un botón
para forzarlo: un atributo `data-theme="claro"` o `data-theme="oscuro"` en `<html>`, con un bloque
de overrides por cada uno (ver `documentacion/diseno/tokens.css`, que ya trae los tres bloques:
claro por defecto, `prefers-color-scheme: dark`, y `[data-theme="oscuro"]`).

Para retematizar todo el sitio **cambiando un solo valor**, los tonos derivados (halos, estados de
hover, acentos suaves) no se escriben a mano — se calculan desde `--ao-marca` con `color-mix()`:
```css
--ao-marca-suave: color-mix(in srgb, var(--ao-marca) 14%, transparent);
--ao-marca-media: color-mix(in srgb, var(--ao-marca) 35%, transparent);
```
Así, tocar `--ao-marca` (o reasignarla por JS a un color elegido por el usuario) mueve botones,
halos y acentos de golpe, sin tocar nada más.

## Patrones de movimiento (opcionales, no obligatorios en cada pantalla)

Ninguno de estos reemplaza los componentes base de arriba; son para pantallas puntuales (login,
landing del portal del cliente, dashboards) donde el equipo decida usarlos. Los tres respetan
`prefers-reduced-motion` (se apagan solos si el usuario lo pidió en su sistema).

- **Tarjetas flotantes**: balanceo vertical sutil continuo (`translateY` ±6-7px, 6s, `ease-in-out`)
  más elevación al pasar el mouse (`y:-6px`, sombra con el color de acento). En reduced-motion, la
  animación continua se apaga; el hover-lift puede quedar (es corto y a pedido del usuario).
- **Carrusel accesible**: autoplay de 5s que se **pausa** con foco de teclado, hover, pestaña oculta
  (`visibilitychange`) o fuera de pantalla (`IntersectionObserver`) — nunca gira sin un control de
  pausa visible. Con reduced-motion no gira solo; el usuario cambia de diapositiva a mano.
- **Fondo orbital**: anillos decorativos con elementos girando alrededor de un centro (`@keyframes`
  de rotación + contra-rotación para que las etiquetas queden siempre legibles). Puramente
  decorativo (`aria-hidden="true"`), nunca lleva información que no esté también en el texto normal
  de la página.

Demo en vivo de todo esto (incluido el selector de acento): artifact "AdOrbit — concepto orbital".
Es una exploración, no se mergeó a ninguna app todavía — si el equipo lo adopta, se actualiza esta
sección con dónde quedó implementado.

## Vista previa

Componentes base (botones, inputs, tarjetas, estados de formulario, un login de ejemplo) armados
con estos tokens: ver el artifact publicado (enlace en el mensaje donde se generó este documento).

## Propuesta de logotipo para web y app

La propuesta del 3 de noviembre de 2026 conserva esta paleta y combina una A con una trayectoria
orbital. Incluye variantes claras/oscuras, íconos, originales SVG, PNG y editables de Affinity.
Archivos y pautas de uso en [diseno/guia-logotipo.md](diseno/guia-logotipo.md); vista de conjunto en
[la presentación](diseno/adorbit-presentacion-identidad.png). Es una propuesta para revisión del
equipo; las pantallas ilustradas son ejemplos de marca y no están implementadas en los frontends.

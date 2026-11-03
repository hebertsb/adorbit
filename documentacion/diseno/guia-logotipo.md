# AdOrbit · Propuesta de identidad visual

Fecha: 3 de noviembre de 2026. Propuesta para revisión del equipo; no modifica los temas ni implementa pantallas de las aplicaciones.

AdOrbit reúne campañas, clientes, creatividades, facturación e inteligencia de una agencia publicitaria. El símbolo combina una A geométrica con una trayectoria orbital que funciona como travesaño y un punto de conexión. Puede reproducirse en una sola tinta. El nombre se acompaña con letras trazadas a partir de Segoe UI Bold, conservando la apariencia sin cargar una fuente en el navegador.

## Archivos entregados

| Uso | Archivo | Características |
|---|---|---|
| Web sobre fondo claro | `adorbit-logo-web.svg` / `.png` | SVG escalable; PNG 640 × 160 transparente |
| Web sobre fondo oscuro | `adorbit-logo-oscuro.svg` / `.png` | Símbolo lila y texto claro; transparente |
| Una sola tinta | `adorbit-logo-blanco.svg` / `.png` | Blanco, transparente; usar sobre fondo oscuro |
| Símbolo independiente | `adorbit-simbolo.svg` y `adorbit-simbolo-blanco.svg` | PNG equivalentes 128 × 128 |
| Ícono de app | `adorbit-icono-app.svg` / `.png` | Maestro 1024 × 1024, índigo opaco y símbolo blanco; sin esquinas precortadas |
| Web/PWA | `adorbit-icono-192.png`, `adorbit-icono-512.png` | Íconos cuadrados; símbolo central con margen para recorte |
| Apple touch | `adorbit-icono-180.png` | Fondo opaco, sin esquinas precortadas |
| Android adaptable | `adorbit-icono-adaptable-frente.svg` / `.png` y `adorbit-icono-adaptable-fondo.svg` / `.png` | Capas separadas 432 × 432; símbolo dentro de la zona segura central |
| Favicon | `adorbit-favicon.svg`, `adorbit-favicon.png`, `adorbit-favicon-16.png` | SVG; PNG 32 × 32 y 16 × 16 |
| Presentación | `adorbit-presentacion-identidad.svg`, `.png` y `.pdf` | Lámina vectorial y vista previa 1800 × 1460 |
| Editables de Affinity | `adorbit-identidad.af`, `adorbit-logotipo.af`, `adorbit-icono-app.af` | Capas y curvas editables; tipografía trazada |

Las exportaciones PNG y los archivos nativos se generaron con Affinity mediante MCP. Los SVG son originales vectoriales construidos con geometría y letras trazadas; se importaron en Affinity y se comprobó visualmente la lámina. `herramientas/generar-identidad.py` permite reconstruir los SVG con fontTools del entorno de diseño (no es una dependencia del producto).

## Colores y uso

Se conservan los valores existentes de `tokens.json` y `tokens.css`:

- Marca en claro: **#4F46E5**. Interacciones más oscuras: **#4338CA**.
- Marca en oscuro: **#8B92FF**.
- Texto en claro: **#1F2937**; texto en oscuro: **#E8EAF3**.
- Fondo claro: **#F6F7FB**; tarjetas: **#FFFFFF**.
- Fondo oscuro: **#0F1220**; tarjetas oscuras: **#181C2E**.

Usar el logo horizontal desde 140 px de ancho y el símbolo solo en espacios compactos. Mantener la proporción; reservar alrededor del símbolo un espacio equivalente, como mínimo, al diámetro del punto orbital. Para 16 px usar el favicon dedicado. No añadir sombras, contornos ni degradados al logotipo. En el ícono de aplicación, el sistema operativo aplica la máscara y las esquinas: el archivo maestro tiene fondo cuadrado completo.

El lema “Tu agencia, en una misma órbita” es opcional y queda fuera del logotipo de producción para conservar legibilidad en las barras de navegación.

## Aplicación en los portales

Los directorios de frontends de esta copia contienen `.gitkeep`; aún no hay componentes ejecutables donde instalar el logotipo. La referencia visual proviene de `08-sistema-diseno.md` y de los tokens existentes. La lámina representa un portal de gestión y una app de campo con datos de ejemplo, como demostración de marca.

Para integrar más adelante, copiar cada SVG/PNG a los recursos estáticos de su aplicación. Los ejemplos siguientes son orientativos y usan rutas relativas al recurso, no rutas ya instaladas:

```html
<img src="adorbit-logo-web.svg" width="160" height="40" alt="AdOrbit" />
<link rel="icon" type="image/svg+xml" href="adorbit-favicon.svg" />
<link rel="apple-touch-icon" href="adorbit-icono-180.png" />
```

En Flutter registrar los recursos en el `pubspec.yaml` de la app cuando exista. El SDK de Flutter no incluye lector SVG de forma predeterminada; los PNG transparentes permiten empezar sin incorporar una dependencia. Los íconos de launcher se instalan en los recursos nativos de Android/iOS correspondientes.

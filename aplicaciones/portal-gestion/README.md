# PortalGestion

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.5.

## Estado verificado en código

<!-- AUTO-GENERATED: estado funcional -->
- Campañas: listado y detalle consultan GraphQL. Se verificó con los contenedores reales el camino JWT → pasarela → GraphQL de campañas y el proxy REST de clientes. El formulario crea por GraphQL y asigna presupuesto por REST; si falla la asignación, permite reintentar solo ese paso con el mismo ID, carga y clave, conservados en la pestaña cuando sessionStorage está disponible. Si no se confirma la creación, debe verificarse la lista antes de crear otra: la pasarela genera una clave nueva en cada petición GraphQL, por lo que no se garantiza deduplicación. La edición usa PUT REST con la versión consultada; cliente y presupuesto no se editan en ese formulario. Falta la prueba visual manual del formulario en navegador.
- Creatividades consulta `ms-creatividades` por la pasarela: lista briefs por campaña, crea briefs y piezas, solicita la URL firmada de Storage, transfiere el archivo y permite aprobar o rechazar piezas. Los UUID se conservan como claves técnicas, pero la interfaz presenta referencias breves `PZA-…` y `CMP-…`.
- Contratar envía una petición REST y la pantalla de SAGA consulta su estado periódicamente cada 2,5 segundos; el flujo completo entre servicios no queda demostrado por la existencia de estas vistas.
- El portal ya se construye y sirve como contenedor independiente en `http://localhost:4200`; se verificaron `/salud`, el fallback de rutas SPA y la carga de la configuración pública. Pendiente verificar visualmente la adaptación responsive en celular y escritorio.
<!-- /AUTO-GENERATED: estado funcional -->

## Panel de reportes

Las rutas del shell exigen sesión y rol. `dashboard`, `campanas`, `sagas`, `reportes`, `clientes` y `facturacion` admiten `gerente|ejecutivo`; `creatividades` admite también `creativo`. El rol `cliente` usa exclusivamente `portal-cliente`. Hay pantallas explícitas 403 y 404; ocultar un enlace del menú no sustituye el guarda de ruta ni la validación del backend. `/reportes` carga el módulo federado. Las direcciones públicas `urlModulo` (archivo `remoteEntry.js`) y `apiIaUrl` se configuran en `public/configuracion-panel.js` antes del despliegue; no incluir credenciales. El remoto y sus recursos deben habilitar CORS para el origen del portal. El panel solicita el token actual en cada llamada y, ante 401, cierra la sesión del portal. El servicio debe validar firma, vigencia, audiencia y roles; la protección del navegador no sustituye esa validación. El portal no renueva tokens actualmente.

`/clientes` consume el CRUD de `ms-clientes-crm` por la pasarela y permite listar, filtrar, dar de alta y editar cuentas, agregar contactos y crear contratos. `/facturacion` consume `ms-facturacion`, unifica sus estados para la vista general, emite facturas o cotizaciones, muestra el detalle y registra cobros. La implementación actual de facturación exige `cliente` o `estado` al listar aunque el OpenAPI todavía los documenta como opcionales; el cliente web consulta por cada estado cuando se solicita la vista general. El buscador superior localiza campañas y clientes reales; la campana presenta alertas navegables por consumo de presupuesto.

## Identidad

El botón de Keycloak usa Authorization Code + PKCE. La autoridad, el cliente público y el emisor de desarrollo se configuran en `public/configuracion-panel.js`. En el Compose completo se usa el emisor compartido de desarrollo en `http://localhost:8180/realms/adorbit`; `permitirEmisorPrueba` debe quedar en `false` al desplegar con Keycloak real. El flujo PKCE completo fue verificado contra el contenedor local: autorización, redirección y canje del código por un JWT aceptado por los cinco microservicios. La cuenta de demostración `Admin` recibe las capacidades `gerente`, `ejecutivo` y `creativo`; la autorización se decide por esos roles, no por el nombre visible.

## Docker

Desde `infraestructura/`:

```bash
docker compose --env-file .env -f docker-compose.completo.yml --profile equipo up -d --build portal-gestion
```

La imagen compila Angular con `npm ci` y sirve los artefactos con nginx no privilegiado. La ruta de salud es `GET http://localhost:4200/salud`.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

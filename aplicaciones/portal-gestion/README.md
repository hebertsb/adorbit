# PortalGestion

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.5.

## Estado verificado en código

<!-- AUTO-GENERATED: estado funcional -->
- Campañas: listado y detalle consultan GraphQL; el detalle incluye calendario y piezas. El formulario obtiene clientes por REST e intenta crear por GraphQL y registrar presupuesto por separado. Si falla la creación, agrega una campaña solo a la memoria local; esto no confirma persistencia. El registro de presupuesto no comprueba el resultado. El formulario en modo edición aún invoca creación, no actualización.
- Creatividades muestra campañas y sus piezas obtenidas en la consulta de campañas, no un listado independiente de briefs. La selección y los contadores son de presentación; agregar medio y subir creatividad en el detalle no están conectados.
- Contratar envía una petición REST y la pantalla de SAGA consulta su estado periódicamente cada 2,5 segundos; el flujo completo entre servicios no queda demostrado por la existencia de estas vistas.
- Pendiente verificar la adaptación responsive en celular y escritorio; la revisión de código no sustituye esas pruebas ni una prueba integrada.
<!-- /AUTO-GENERATED: estado funcional -->

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

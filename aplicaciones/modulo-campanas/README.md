# Módulo Campañas (Remote Module Federation) · AdOrbit

Microfrontend remoto de gestión de campañas diseñado para ser consumido federadamente por el **Portal de Gestión (Shell Angular)** de AdOrbit.

## Estructura y Exportación Federada

- **Remote Name**: `moduloCampanas`
- **Exposed Modules**:
  - `./CampanasLista`: Componente de consulta, filtrado y vista rápida de campañas.
  - `./CampanaDetalle`: Ficha operativa completa, presupuesto, calendario y disparador de contratación SAGA.
  - `./CampanaFormulario`: Creación y edición con validación de fechas e invariantes.

## Conexión

Este módulo se conecta a través del **API Gateway / Pasarela GraphQL** (`http://localhost:8000/graphql`) consumiendo los subgrafos de campañas y clientes federados.


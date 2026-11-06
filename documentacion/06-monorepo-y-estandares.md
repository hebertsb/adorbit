# 06 · Monorepo, estándares y despliegue

> Regla de idioma: todo en español (carpetas, archivos, variables, tablas, mensajes); excepciones y
> glosario en `CLAUDE.md`, sección "Idioma y nomenclatura".

> Complementa la sección "Estructura del repositorio" de `CLAUDE.md`. Las plantillas de abajo son el
> punto de partida del bootstrap; ajustar al implementar.

## Por qué monorepo
Contratos, documentación y reglas viven juntos (3 personas, 12 días). Cada servicio es una carpeta con su
propia imagen, así que **se despliega por separado y en la nube que le toque** sin necesidad de repos
distintos. Si el docente exige repos separados, cada carpeta se extrae con `git filter-repo` sin cambios.

## Qué cambió respecto a la propuesta inicial del compañero
| Propuesta inicial | Decisión | Motivo |
|---|---|---|
| `libs/idempotencia-java`, `libs/idempotencia-node` | **Sin librerías compartidas de runtime**; la idempotencia se implementa en cada servicio siguiendo la especificación | Hay 4 lenguajes (la librería solo cubriría 3 servicios); una librería compartida acopla builds y despliegues entre nubes y dueños distintos |
| `libs/contratos-api` | `contratos/` (OpenAPI + esquemas JSON de eventos + GraphQL) | Se comparten **datos**, no código; sirven para pruebas de contrato |
| `infraestructura/k8s/` | Se elimina; `infraestructura/despliegue/` con notas por nube | Cada servicio va como contenedor a su nube; Kubernetes no aporta en 12 días |
| `aplicaciones/portal-gestion` solo | Se agrega `aplicaciones/modulo-campanas` (Angular) | Module Federation necesita el shell **y** el remote |
| — | `plataforma/` (gateway, Keycloak, RabbitMQ, n8n) | Piezas transversales que no son microservicios de negocio |
| — | `.github/` (CODEOWNERS, CI y deploy por servicio) | Evita interferencias y automatiza el despliegue |

## Dueños (CODEOWNERS)
```
# .github/CODEOWNERS  (reemplazar @a, @b, @c por los usuarios reales de GitHub)
/CLAUDE.md                     @a @b @c
/documentacion/                         @a @b @c
/contratos/                    @a @b @c
/base_de_datos/ms-campanas.*        @a
/base_de_datos/ms-facturacion.*     @b
/base_de_datos/ms-clientes-crm.*    @b
/base_de_datos/ms-creatividades.*   @c
/base_de_datos/ms-ia.*              @c
/servicios/ms-campanas/         @a
/servicios/ms-facturacion/      @b
/servicios/ms-clientes-crm/     @b
/servicios/ms-creatividades/    @c
/servicios/ms-ia/               @c
/aplicaciones/portal-gestion/          @a
/aplicaciones/modulo-campanas/         @a
/aplicaciones/portal-cliente/          @b
/aplicaciones/panel-inteligencia/                @b
/aplicaciones/app-movil/               @b
/plataforma/pasarela/             @a
/plataforma/keycloak/            @a
/plataforma/rabbitmq/            @a
/plataforma/n8n/                 @b
/infraestructura/                        @a @b
```
Un cambio en una carpeta ajena requiere la aprobación de su dueño (activar "Require review from Code Owners").

## Despliegue por nube (propuesta)
| Nube | Qué se despliega | Dueño | Notas |
|---|---|---|---|
| AWS | ms-facturacion, ms-clientes-crm | B | DynamoDB nativo; contenedores en ECS/Fargate, App Runner o EC2 pequeño |
| Azure | ms-campanas, gateway | A | Container Apps o App Service; Atlas en región Azure para MongoDB |
| Servidor personal / Google Cloud | ms-creatividades, ms-ia | C | Cloud Run o servidor propio expuesto por túnel; tener `docker compose` local de respaldo |
| Cualquier hosting estático | `aplicaciones/*` web | A, B | Azure Static Web Apps, Cloudflare Pages o Netlify; remotes con URL estable y CORS |
| Firebase App Distribution | `aplicaciones/app-movil` | B | APK de prueba para la defensa |
| Servicios administrados | RabbitMQ (p. ej. CloudAMQP), Keycloak en un solo lugar estable | A | Verificar planes gratuitos vigentes antes de crear cuentas |

Los servicios se hablan por HTTPS público (REST) y por RabbitMQ; ninguno depende de estar en la misma red.
Los secretos de cada nube se guardan en **GitHub Secrets** (por entorno) y solo los administra su dueño.

## Plantilla de CI/CD por servicio
```yaml
# .github/workflows/despliegue-ms-facturacion.yml
name: despliegue-ms-facturacion
on:
  push:
    branches: [main]
    paths: ['servicios/ms-facturacion/**', 'contratos/openapi/ms-facturacion.yaml']
jobs:
  construir-probar-desplegar:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Pruebas
        run: make probar S=ms-facturacion
      - name: Construir imagen
        run: docker build -t adorbit/ms-facturacion:${{ github.sha }} servicios/ms-facturacion
      # Login y despliegue específicos de la nube (AWS/Azure/GCP) con secretos del repo
```
`integracion-<x>.yml` = lo mismo en `pull_request` pero sin desplegar. Un CI/CD por servicio y por app.

## Variables de entorno (convención)
`ADORBIT_<SERVICIO>_<NOMBRE>` en mayúsculas. Comunes: `…_URL_BD`, `…_URL_RABBITMQ`, `…_EMISOR_OIDC`,
`…_AUDIENCIA_OIDC`, `…_NIVEL_LOG` (por ejemplo `ADORBIT_CAMPANAS_URL_BD`). Cada servicio incluye un `.env.ejemplo` **solo con nombres y valores
ficticios**. Los reales van a `.env` (ignorado) o a los secretos de la nube.

## Plantilla `Makefile` (raíz)
```make
levantar:  ; docker compose -f infraestructura/docker-compose.yml up -d
bajar:     ; docker compose -f infraestructura/docker-compose.yml down
registros: ; docker compose -f infraestructura/docker-compose.yml logs -f $(S)
probar:    ; ./herramientas/probar.sh $(S)      # ejecuta las pruebas del servicio S
revisar:   ; ./herramientas/revisar.sh $(S)     # formato y análisis estático
```

## Esqueleto de `infraestructura/docker-compose.yml`
Servicios mínimos: `rabbitmq` (con `plataforma/rabbitmq/definiciones.json`), `keycloak` (importa
`plataforma/keycloak/dominio.json.template`, sustituido en el arranque — ver su README), `postgres-campanas`, `postgres-ia`, `mongo`, `dynamodb-local`, y luego cada
`ms-*` con `env_file: ../servicios/<ms>/.env` y `depends_on` de su BD y del broker. Los scripts de
`base_de_datos/` se aplican al arrancar (volumen `docker-entrypoint-initdb.d` en Postgres, script de inicio en
Mongo y Dynamo).

## Pendiente
- `documentacion/07-patrones.md`: especificación única de idempotencia, outbox y consumidor deduplicado, con la lista
  de pruebas que todo servicio debe pasar (aún no escrito).

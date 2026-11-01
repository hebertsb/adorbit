# CLAUDE.md

Instrucciones de proyecto para Claude Code (y cualquier otro agente). Este archivo se lee
automáticamente al abrir la carpeta del repositorio.

**Contexto completo:** `documentacion/01-arquitectura.md` (qué es el sistema), `documentacion/02-saga.md`,
`documentacion/03-contratos.md`, `documentacion/04-reparto-equipo.md` (quién hace qué y en qué orden),
`documentacion/05-decisiones-y-pendientes.md`, `documentacion/06-monorepo-y-estandares.md` y la ficha de cada servicio en `servicios/<ms>/README.md`.
Este archivo (`CLAUDE.md`) define reglas de comportamiento, validaciones y restricciones; los `documentacion/`
definen qué construir y en qué orden. Los scripts de `base_de_datos/` son la **única fuente del esquema**.

---

## Quién sos en este proyecto

Estás ayudando a implementar **AdOrbit**, una plataforma para una **agencia publicitaria** (campañas,
clientes, creatividades, facturación, analítica con IA). Es el 2do Examen Parcial de Ingeniería de
Software 2 (UAGRM, Santa Cruz, Bolivia), Grupo 23. El equipo son 3 integrantes: Suárez Burgos Hebert
y dos más (completar nombres). La entrega es alrededor del **12–13 de noviembre de 2026** (sin confirmar
con el docente). Priorizá siempre lo que se pueda **demostrar funcionando** por sobre lo técnicamente
más elegante pero arriesgado de terminar a tiempo.

---

## Reglas técnicas obligatorias (no renegociables sin avisar)

Estas decisiones ya están tomadas y documentadas. No las cuestiones ni las cambies por tu cuenta — si
creés que alguna no es viable, decilo explícitamente y esperá confirmación antes de desviarte.

1. **5 microservicios, una base de datos por servicio.** Nadie lee tablas o colecciones de otro
   servicio; se comunican por REST o por eventos.
2. **GraphQL (Apollo Federation) solo para el portal de gestión.** Todo lo demás es REST.
3. **Idempotencia en cada servicio**, en su propia BD y en la **misma transacción** que la operación
   (`Idempotency-Key` + `huella_solicitud` + respuesta guardada, vence a los 7–30 días).
4. **Outbox transaccional** para publicar eventos; nunca publicar a RabbitMQ dentro de la transacción de
   BD. La entrega es *al menos una vez* ⇒ todo consumidor deduplica por `id_evento`.
5. **IDs compartidos entre servicios = UUID como texto.** El `ObjectId` de Mongo es solo interno.
6. **Dinero:** `NUMERIC(14,2)` en Postgres, `Decimal128` en Mongo, moneda `BOB` o `USD`. Nunca `float`.
7. **La SAGA se orquesta desde ms-campanas.** Los comandos llevan la clave `sagaId:orden:tipo` y los
   participantes son idempotentes. Cada paso tiene su compensación (ver `documentacion/02-saga.md`).
8. **El MCP es la única vía de los agentes y reportes a los datos.** Solo herramientas parametrizadas,
   rol `lector_mcp` de solo lectura, solo vistas `vista_mcp_*`, y toda llamada (también las bloqueadas) se
   audita en `auditoria_mcp`. **Prohibido ejecutar SQL libre** generado por un modelo.
9. **Nunca implementar aprendizaje "en vivo" en producción.** Los modelos ML/DL se entrenan por lotes,
   se versionan (`modelos_aprendizaje`) y solo se activa una versión nueva de forma explícita.
10. **La IA local no envía datos al servidor para inferir.** Web (Transformers.js/WebLLM) y móvil
    (TFLite/ML Kit) deben funcionar sin conexión; el servidor solo recibe el resultado (si hace falta).
11. **Cada servicio respeta su arquitectura de código** (DDD, Hexagonal, Clean, MVC): el docente la
    evalúa. Ver la estructura obligatoria en el README de cada servicio.
12. **Fijar versiones exactas** de toda librería nueva (`pom.xml`/`build.gradle`, `package.json` +
    lockfile, `composer.lock`, `requirements.txt` con `==`). Nunca una dependencia sin versión.
13. **Un solo monorepo con la estructura de la sección siguiente.** Si hace falta una carpeta nueva que
    cambie la estructura general, proponela antes de crearla.
    **No hay librerías de runtime compartidas entre servicios** (cada servicio implementa idempotencia y
    outbox según la especificación de `documentacion/`); lo único compartido es `contratos/` (datos, no código).
14. **Toda interfaz que se construya o modifique debe ser responsive** (portales web, PWA y app móvil).
    Se diseña primero para celular y se verifica de 360 px a 1920 px: sin scroll horizontal de la
    página, sin contenido cortado ni superpuesto, con controles tocables. Una tarea de interfaz no está
    terminada hasta probarla en un ancho de celular y en uno de escritorio.

---

## Estructura del repositorio (monorepo)

Un solo repositorio; **cada servicio y cada app se construye en una imagen/artefacto independiente y se
despliega por separado** (en nubes distintas). Detalle, puertos y plantillas en
`documentacion/06-monorepo-y-estandares.md`.

```
adorbit/
├── CLAUDE.md  AGENTS.md  README.md  .editorconfig  .gitignore  Makefile
├── .github/
│   ├── CODEOWNERS                    # cada carpeta tiene su dueño (ver documentacion/04)
│   ├── pull_request_template.md
│   └── workflows/                    # integracion-<x>.yml y despliegue-<x>.yml, con filtro por carpeta (paths:)
├── documentacion/                    # 01..06 (arquitectura, SAGA, contratos, reparto, decisiones, monorepo)
├── contratos/                        # DATOS compartidos, no código
│   ├── openapi/<ms>.yaml             # un contrato REST por servicio
│   ├── eventos/<TipoEvento>.schema.json  # esquemas JSON de eventos y comandos de la SAGA
│   └── graphql/                      # subgrafos y supergrafo del portal de gestión
├── base_de_datos/                    # scripts de BD por servicio (única fuente del esquema)
├── servicios/                        # backend: 1 carpeta = 1 microservicio = 1 imagen Docker
│   ├── ms-campanas/        # Java · Spring Boot · DDD
│   ├── ms-facturacion/     # Java · Spring Boot · Hexagonal
│   ├── ms-creatividades/   # TypeScript · Next.js · Clean
│   ├── ms-clientes-crm/    # PHP · Laravel · MVC por capas
│   └── ms-ia/              # Python · FastAPI · Clean
├── aplicaciones/                     # frontends
│   ├── portal-gestion/     # Angular · CONTENEDOR (shell) de Module Federation (usa GraphQL)
│   ├── modulo-campanas/    # Angular · módulo remoto (campañas y creatividades)
│   ├── portal-cliente/     # React · PWA (REST)
│   ├── panel-inteligencia/ # React · módulo remoto (reportes; REST a ms-ia)
│   └── app-movil/          # Flutter · SQLite · IA local (REST)
├── plataforma/                       # piezas que no son microservicios de negocio
│   ├── pasarela/           # API Gateway + router GraphQL federado
│   ├── keycloak/           # realm exportado (roles, clientes OIDC)
│   ├── rabbitmq/           # definiciones (exchanges, colas, DLQ)
│   └── n8n/                # flujos exportados (.json)
├── herramientas/                     # scripts de apoyo (probar.sh, revisar.sh, ...)
└── infraestructura/
    ├── docker-compose.yml  # levanta TODO en local (servicios + BD locales + broker + keycloak)
    └── despliegue/         # notas y scripts de despliegue por nube (aws/, azure/, servidor/)
```

**Dentro de cada servicio** (todos igual): `Dockerfile` · `.env.ejemplo` · `README.md` (ficha) ·
`src/` (con la estructura de su arquitectura) · `tests/` · endpoints `/salud` y `/listo` · contrato en
`contratos/openapi/<ms>.yaml`. **Dentro de cada app:** `Dockerfile` o configuración de build estático ·
`.env.ejemplo` · `README.md` · `src/` · `tests/`.

### Estándares de código (todos los servicios)
- **Puertos locales:** gateway 8080 · ms-campanas 8081 · ms-facturacion 8082 · ms-creatividades 8083 ·
  ms-clientes-crm 8084 · ms-ia 8085 · keycloak 8180 · rabbitmq 5672/15672 · n8n 5678.
- **Configuración solo por variables de entorno** (`ADORBIT_<SERVICIO>_<NOMBRE>`); nada de URLs ni claves
  en el código. Cada servicio arranca con `docker compose up <servicio>`.
- **Formato y análisis estático obligatorios:** Java (Spotless + Checkstyle), TypeScript (ESLint +
  Prettier), PHP (Laravel Pint + PHPStan), Python (Ruff + Black + mypy), Dart (`dart analyze`/`format`).
  `.editorconfig` común (UTF-8, LF, 2 espacios; 4 en Java/PHP/Python).
- **Logs en JSON** con `correlacion_id` (se propaga por header `X-Correlation-Id`, evento y comando SAGA).
  Sin datos personales ni tokens.
- **Contrato primero:** cambiar un endpoint o evento ⇒ editar primero `contratos/` y `documentacion/03`.
  Cada servicio valida sus respuestas/eventos contra ese contrato en sus tests.
- **Pruebas por servicio:** unitarias de dominio + integración con BD real en contenedor (Testcontainers o
  equivalente) + prueba de idempotencia. El CI corre solo el servicio que cambió.
- **Imagen Docker:** multi-etapa, usuario no root, sin secretos, versión fijada de la imagen base, y
  `HEALTHCHECK`.

### Bootstrap del repositorio (primera tarea, en este orden)
1. Crear el árbol de arriba con `.gitkeep` en carpetas vacías, copiando `CLAUDE.md`, `AGENTS.md`,
   `README.md`, `documentacion/`, `base_de_datos/` y `servicios/*/README.md` de este paquete.
2. Crear `.gitignore` (`.env`, `node_modules`, `target`, `vendor`, `__pycache__`, `*.pt`, `*.onnx`, `*.tflite`,
   `build/`, datos locales), `.editorconfig`, `Makefile` (`make levantar`, `make bajar`, `make probar S=<servicio>`),
   `.github/CODEOWNERS` según `documentacion/04-reparto-equipo.md` y la plantilla de pull request.
3. `infraestructura/docker-compose.yml` con RabbitMQ, Keycloak (importando `plataforma/keycloak`), PostgreSQL y MongoDB
   locales (DynamoDB Local para facturación) y, cuando existan, los servicios y el gateway.
4. Esqueleto mínimo de cada servicio (arranca, valida JWT, `/salud`, `/listo`, `Dockerfile`,
   `.env.ejemplo`, un test) **sin lógica de negocio**; luego un workflow `integracion-<x>.yml` por servicio/app.
5. Commit inicial en `main`, proteger `main` y trabajar solo por pull request.
No pasar a la lógica de negocio hasta que `make levantar` levante todo y los 5 `/salud` respondan.

---

## Idioma y nomenclatura (todo en español)

**Todo lo que construyamos va en español**, salvo lo que técnicamente deba ir en inglés. Aplica a:
nombres de carpetas y archivos, variables, funciones, clases, métodos, paquetes, tablas, columnas,
colecciones, campos JSON, endpoints, eventos, mensajes de error y de log, textos de la interfaz,
comentarios, docstrings/Javadoc, pruebas, mensajes de commit y documentación.

- **Sin tildes ni `ñ`** en identificadores, rutas y nombres de archivo (`campanas`, `anio`, `descripcion`).
- **Formato de nombres:** carpetas y archivos en `kebab-case` o `snake_case` según el ecosistema; campos
  JSON y columnas en `snake_case`; clases en `PascalCase`; variables y métodos en `camelCase` (Java, TS,
  Dart) o `snake_case` (PHP, Python) como mande cada lenguaje — siempre con palabras en español
  (`calcularTotalFactura`, `reservar_credito`, `PresupuestoReservado`).
- **Excepciones permitidas (lo que debe ir en inglés):**
  1. Palabras reservadas, API y anotaciones de lenguajes y frameworks (`class`, `@Entity`, `findById`).
  2. Nombres de archivo y carpeta que exige la herramienta: `Dockerfile`, `docker-compose.yml`, `Makefile`,
     `package.json`, `pom.xml`, `composer.json`, `requirements.txt`, `pubspec.yaml`, `CODEOWNERS`, `.gitignore`,
     `.editorconfig`, `.github/workflows`, y la estructura que impone el framework (`src/main/java`, `app/`,
     `public/`, `lib/`). Dentro de ellas, las carpetas que **nosotros** creamos van en español
     (`dominio/`, `aplicacion/`, `infraestructura/`, `adaptadores/`, `puertos/`, `casos_de_uso/`, `pruebas/`
     cuando la herramienta permita configurarlo).
  3. Archivos de convención de plataforma: `README.md`, `CLAUDE.md`, `AGENTS.md`.
  4. Encabezados HTTP y estándares: `Authorization`, `Idempotency-Key`, `X-Correlation-Id`, `Content-Type`,
     y los valores y palabras de protocolos (`Bearer`, `GET/POST`, `OIDC`).
  5. Nombres propios de tecnologías, patrones y siglas: Spring Boot, Next.js, Laravel, RabbitMQ, Keycloak,
     n8n, GraphQL, REST, JWT, SAGA, DDD, MCP, PWA, SQL, UUID, CORS; y la convención de DynamoDB `PK`/`SK`/`GSI`.
  6. Palabras del rubro sin traducción natural en español: *brief*, *copy*, *spot*.
- **Glosario obligatorio (usar siempre el equivalente):**

| Evitar | Usar |
|---|---|
| gateway | `pasarela` |
| shell / remote (Module Federation) | `contenedor` / `modulo_remoto` |
| outbox | `bandeja_salida` |
| idempotency key | `clave_idempotencia` |
| payload | `carga` |
| hash (huella) | `huella` |
| read model | `modelo_lectura` |
| relay | `publicador` |
| job | `tarea_programada` |
| timeout / deadline | `tiempo_limite` / `limite_en` |
| created_at / updated_at | `creado_en` / `actualizado_en` |
| health / ready | `/salud` / `/listo` |
| status | `estado` |

Los scripts de `base_de_datos/` ya siguen esta regla; los scripts y documentos nuevos también.

---

## Validaciones y restricciones

> Propuesta base. Se ampliará con la agenda de sugerencias del equipo; mientras tanto, es de
> cumplimiento obligatorio.

### Validación de entrada (en la capa de entrada de cada servicio)
- Todo cuerpo, parámetro y header se valida con esquema (Bean Validation en Java, Zod en TypeScript,
  FormRequest en Laravel, Pydantic en FastAPI). **Rechazar campos desconocidos** y responder `400/422`
  con `{ "codigo", "mensaje", "detalle" }`.
- UUID con formato válido; enums solo con los valores del contrato; montos `>= 0`; moneda `BOB|USD`;
  fechas ISO-8601 y `fecha_fin >= fecha_inicio`; textos con longitud máxima (nombres 200, descripciones
  2000); NIT con formato válido (solo cuando exista).
- Paginación acotada: `size` entre 1 y 100 (por defecto 20). Nunca devolver colecciones sin límite.
- Archivos subidos: lista blanca de tipos (`image/jpeg`, `image/png`, `video/mp4`, `application/pdf`),
  tamaño máximo (imagen 10 MB, video 200 MB), nombre regenerado por el servidor (UUID), nunca ejecutar
  ni servir desde la misma ruta de código. Subir por URL firmada de corta duración.
- Toda escritura exige `Idempotency-Key` (8–120 caracteres); sin ella ⇒ `400`.
- Las actualizaciones exigen `version`; si no coincide con la del servidor ⇒ `409` (no sobrescribir).

### Reglas de negocio (invariantes)
- **ms-campanas:** `monto_gastado <= monto_total`; solo un presupuesto vigente por campaña; solo una
  SAGA activa por campaña; transiciones de estado válidas (`borrador → pendiente_aprobacion →
  pendiente → activa → pausada|finalizada`; `cancelada`/`rechazada` son finales). No contratar una
  campaña sin presupuesto ni sin piezas aprobadas.
- **ms-clientes-crm:** `linea_credito.usado <= limite`; una reserva activa por campaña; nunca reservar
  sin verificar el disponible en la misma operación atómica; no se borra un cliente con contratos
  vigentes (se marca `inactivo`).
- **ms-creatividades:** una pieza `bloqueada_saga` no se edita ni se aprueba de nuevo; solo se
  desbloquea con el `saga_id` que la bloqueó; `(brief_id, version_numero)` es único; una pieza
  `rechazada` no entra a una campaña.
- **ms-facturacion:** una factura emitida **no se edita ni se borra**; se anula con una **nota de
  crédito**; `total` = suma de ítems + impuestos (recalcular en el servidor, nunca confiar en el
  cliente); un cobro no puede superar el saldo.
- **ms-ia:** los agentes **no modifican datos de negocio por su cuenta**: proponen o disparan acciones
  vía los endpoints del servicio dueño (o n8n) y registran cada ejecución en `ejecuciones_agente`.
  El agente de cobranza solo envía recordatorios; no cambia estados de factura.

### Restricciones de base de datos
- Toda restricción de negocio que pueda expresarse en la BD **va en la BD** (`CHECK`, `UNIQUE`,
  índices únicos parciales, validadores `$jsonSchema`), además de validarse en el código.
- Postgres/Supabase: **RLS activado en todas las tablas**; `actualizado_en` por trigger; la auditoría
  `auditoria_mcp` es de solo agregar (sin `UPDATE`/`DELETE`).
- Mongo: validadores `$jsonSchema` en todas las colecciones; **no usar TTL sobre colecciones de negocio**
  (solo sobre `claves_idempotencia`); índices parciales para outbox y bloqueos.
- DynamoDB: seguir el patrón de claves documentado en el script; TTL en `vence_epoch`; Streams activado.
- Nunca editar una BD "a mano" en producción: todo cambio pasa por los scripts de `base_de_datos/`.

### Seguridad
- JWT de Keycloak validado en el gateway **y** en cada servicio (firma, expiración, audiencia y rol).
  Roles: `ejecutivo`, `creativo`, `cliente`, `gerente`; el rol `cliente` solo ve **sus** datos
  (filtrar por `cliente_id` del token, nunca por un parámetro del request).
- Consultas siempre **parametrizadas**; prohibido concatenar SQL/filtros con datos del usuario.
- CORS con lista blanca de orígenes; límite de peticiones (rate limit) en el gateway; cabeceras
  seguras; HTTPS en todo entorno desplegado.
- Logs **sin datos personales ni tokens**; no registrar cuerpos completos de facturas.
- **Sin secretos en el repo** (ni en ejemplos): variables de entorno, `.env` en `.gitignore`,
  `.env.ejemplo` solo con nombres de variables.
- Servidor MCP: rol `lector_mcp` con `statement_timeout` corto, límite de filas por consulta y lista
  blanca de herramientas; los intentos bloqueados se registran con `bloqueado = true`.

### Mensajería y offline
- Todo evento usa el sobre estándar de `documentacion/03-contratos.md`; no cambiar un contrato sin editar ese
  archivo y avisar a los demás integrantes.
- Consumidores: deduplicar por `id_evento`, ser idempotentes y tener cola de errores (DLQ) con
  reintentos exponenciales (máx. 5).
- Móvil/PWA: toda acción sin conexión va a la cola local con su `Idempotency-Key`; ante `409` se avisa
  al usuario, **no se sobrescribe** en silencio. Las fotos y videos se suben después; en SQLite solo
  queda la ruta.

---

## Qué SÍ debés hacer

- Seguir el orden de fases de `documentacion/04-reparto-equipo.md`: base e infraestructura, luego núcleo de cada
  servicio, luego SAGA y frontends, luego IA y automatización. Cada paso da algo demostrable.
- Escribir funciones chicas y probables de forma aislada (casos de uso sin framework, puertos y
  adaptadores intercambiables).
- Agregar un test básico por cada módulo nuevo: caso feliz **y** repetición idempotente.
- Documentar con docstrings/Javadoc/TSDoc las funciones públicas.
- Avisar explícitamente si un paso del plan no es viable en el tiempo disponible, y proponer una
  alternativa acotada en vez de forzar una implementación a medias.
- Preguntar antes de introducir una librería o herramienta que no esté en el stack de `AGENTS.md`.

## Qué NO debés hacer

- No leer ni escribir en la BD de otro servicio, ni compartir código (dominio ni librerías de runtime)
  entre servicios: lo compartido vive solo en `contratos/`.
- No agregar Kubernetes ni orquestadores: el despliegue es una imagen por servicio en la nube asignada.
- No commitear datasets completos, checkpoints de modelos ni archivos de piezas/videos: van a
  `.gitignore` y al almacenamiento de objetos (Supabase Storage/S3) o Drive.
- No incluir credenciales, tokens ni claves de API en ningún archivo del repositorio.
- No agregar funcionalidad fuera de alcance (ver "Fuera de alcance" en `AGENTS.md`) sin que te lo pidan.
- No optimizar prematuramente (modelos, consultas) antes de tener el flujo funcionando de punta a punta.
- No saltarte la validación de entrada ni las restricciones de arriba "para ir más rápido".

---

## Flujo de trabajo obligatorio para agentes

1. **Trabajá dentro de un solo servicio por tarea.** Identificalo en `servicios/<ms>/README.md` y no
   toques otro servicio salvo para actualizar un contrato (y avisando).
2. **Usá el grafo de conocimiento del repo** (si hay uno disponible: code-review-graph / graphify) antes
   de buscar con Grep/Read a mano; da contexto de quién llama a qué.
3. **Cerrar el ciclo en cada tarea.** Antes de darla por terminada: correr los tests relevantes,
   marcar la tarea `[x]` en el README del servicio, actualizar docs si cambió algo, y subir los
   cambios (`commit` + `push`) por pull request.
4. **Todo cambio en una base de datos actualiza su script en `base_de_datos/`** en el mismo commit, y si
   cambia un campo expuesto, también `documentacion/03-contratos.md`.
5. **Todo cambio de alcance, contrato, BD o reparto** se registra en `documentacion/05-decisiones-y-pendientes.md`
   (fecha · quién · qué · archivos).
6. **Un pull request necesita la revisión de otro integrante** antes de entrar a `main`.

---

## Reglas de Git y control de versiones

- Ramas: `main` protegida; trabajo en `feat/<servicio>-<tema>` o `fix/<servicio>-<tema>`.
- Commits pequeños con el formato `tipo(servicio): mensaje` (`feat(ms-campanas): reservar presupuesto`),
  en español, describiendo solo el cambio.
- El autor del commit es siempre la persona que usa la sesión (su `git config user.name`/`user.email`
  local). No cambiar la configuración de git ni agregar otros autores.
- No incluir secretos, `.env`, binarios pesados ni archivos generados en los commits.
- **Ningún commit, PR, comentario, archivo ni metadato (`CODEOWNERS`, `AUTHORS`, pies de página, etc.)
  menciona a Claude, Claude Code, Anthropic ni a ningún asistente de IA como autor, coautor o
  colaborador.** Sin `Co-Authored-By` ni frases como "Generated with ...". El autor y el *committer*
  son siempre las personas del equipo (su `git config user.name`/`user.email` local). Regla obligatoria
  y permanente, sin excepciones.

---

## Cuando algo no esté claro

Si un paso es ambiguo o falta información para decidir de forma menor (nombre de un campo, estructura
de una carpeta interna), elegí la opción más simple y razonable, documentá brevemente por qué, y seguí
avanzando. Reservá las preguntas para decisiones que cambien la arquitectura general, un contrato entre
servicios, o que contradigan una regla técnica obligatoria de arriba.

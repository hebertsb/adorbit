# Guion de defensa — Preguntas 2 y 4

> **Pregunta 2:** La aplicación en el subsistema de gestión empresarial implementa por lo menos 2 agentes inteligentes.
> **Pregunta 4:** La aplicación implementa: A) GraphQL, B) Modo offline, C) Machine Learning supervisado y no supervisado.

**Antes de empezar (5 min antes):**
- Tailscale conectado en la laptop.
- Abrir en pestañas:
  1. Portal de gestión: http://4.151.177.116/login — usuario `gerente@adorbit.com` / `admin` (ve todo).
  2. n8n: http://100.99.124.109:5678 (para mostrar la notificación que dispara un agente).
  3. Mailpit: http://4.151.177.116/mailpit/ (llega el correo del agente).
- Tener el celular con la app móvil abierta y con sesión iniciada (para el offline móvil).

Orden recomendado: **Pregunta 2 → 4A GraphQL → 4C ML → 4B Offline** (el offline al final porque hay que cortar la red).

---

## PREGUNTA 2 — Agentes inteligentes (mínimo 2)

### Qué decir (30 segundos)
"Un agente inteligente **percibe** su entorno, **decide** y **actúa** solo. En AdOrbit los agentes viven en el microservicio **ms-ia** (Python/FastAPI). Todos perciben los datos del negocio **únicamente a través de MCP** (Model Context Protocol): no tocan las tablas directo, usan herramientas auditadas sobre vistas de solo lectura. Tenemos 4 agentes de tarea + 1 agente conversacional con LLM."

| # | Agente | Percibe (herramientas MCP) | Decide | Actúa |
|---|---|---|---|---|
| 1 | **Monitor de Campañas** | `consultar_campanas(estado=activa)` | Si gasto ≥ 90 % del presupuesto | Publica evento `AlertaCampana` (outbox → RabbitMQ) + notificación n8n |
| 2 | **Agente de Cobranza** | `facturas_por_vencer(7)` + `clientes_morosos()` | Clasifica vencidas / por vencer / morosos | Reporte + notificación n8n (WhatsApp/correo) |
| 3 | **Agente de Visión (DL)** | `consultar_campanas` + resultados YOLO | Conformes vs. con observaciones de marca | Reporte de auditoría visual |
| 4 | **Consultor Ejecutivo IA** | 3 herramientas MCP combinadas | Calcula ejecución presupuestaria y cartera | Panorama ejecutivo + notificación |
| 5 | **Asistente de Reportes (LLM)** | El **LLM (Groq, gpt-oss-120b) elige qué herramienta MCP llamar** | Function calling, hasta 4 rondas | Reporte con tabla, gráfico, análisis, exportar PDF/Excel, WhatsApp |

El 5 es el más "inteligente": nadie le programa qué consulta hacer, **el modelo de lenguaje lo decide** según la pregunta en español.

### Cómo demostrarlo
**Agentes 1–4 (Dashboard):**
1. Entrar como gerente → **Dashboard**.
2. Sección de **Agentes IA** → botón **Ejecutar** en *Monitor de Campañas*.
3. Mostrar el resultado: "Se auditaron N campañas activas (X alertas…)".
4. Ejecutar *Agente de Cobranza* → muestra facturas vencidas / morosos.
5. Ir a **Mailpit** → llegó el correo "Agente de Cobranza: reporte completado" (lo envió n8n, flujo `adorbit-06`).
6. (Opcional) En **Automatizaciones** (menú lateral) se ve la ejecución de n8n recién hecha.

**Agente 5 (Reportes con LLM):**
1. Menú **Reportes**.
2. Escribir: `¿Qué clientes están en mora? muéstrame solo el nombre y el monto`
3. Mostrar:
   - "Herramienta usada: `clientes_morosos`" → **la eligió el LLM**.
   - "La IA eligió mostrar: …" → el LLM además decidió qué columnas mostrar (`definir_presentacion`).
   - Botón **Columnas** para ajustar a mano, exportar PDF/Excel y enviar por WhatsApp.
4. Otra pregunta distinta para que vea que cambia de herramienta: `facturas que vencen en los próximos 30 días`.

**Prueba de que todo pasa por MCP (auditoría):** cada llamada de agente queda registrada en la tabla `auditoria_mcp` (endpoint `GET /api/v1/mcp/auditoria`), incluidas las bloqueadas por parámetros inválidos.

### Dónde está el código (si pregunta "¿dónde está?")
| Qué | Archivo | Líneas |
|---|---|---|
| Endpoints de agentes (`GET /agentes`, `POST /agentes/{id}/ejecutar`, roles ejecutivo/gerente) | [servicios/ms-ia/app/api/agentes.py](../servicios/ms-ia/app/api/agentes.py) | 31–45, 114–158 |
| Notificación multicanal al terminar (n8n) | [servicios/ms-ia/app/api/agentes.py](../servicios/ms-ia/app/api/agentes.py) | 146–156 |
| **Lógica de los agentes** (despacho por nombre) | [servicios/ms-ia/app/use_cases/ejecutar_agente.py](../servicios/ms-ia/app/use_cases/ejecutar_agente.py) | 109–120 |
| Umbral 90 % y días de cobranza | mismo archivo | 24–25 |
| Agente Monitor (percibe → decide → publica evento outbox) | mismo archivo | 122–165 |
| Agente Cobranza | mismo archivo | 167–192 |
| Agente Visión | mismo archivo | 194–232 |
| Consultor Ejecutivo | mismo archivo | 234–264 |
| Idempotencia (no ejecuta dos veces con el mismo `Idempotency-Key`) | mismo archivo | 101–107 |
| Webhook a n8n | [servicios/ms-ia/app/adapters/notificaciones/webhook_notificador.py](../servicios/ms-ia/app/adapters/notificaciones/webhook_notificador.py) | 13–48 |
| **Agente LLM**: bucle de function calling | [servicios/ms-ia/app/use_cases/generar_reporte.py](../servicios/ms-ia/app/use_cases/generar_reporte.py) | 71–137 |
| Herramientas que ve el LLM + prompt del sistema | [servicios/ms-ia/app/adapters/llm/groq_cliente.py](../servicios/ms-ia/app/adapters/llm/groq_cliente.py) | 18–104, 122–135 |
| Frontera MCP (consultas auditadas) | [servicios/ms-ia/app/use_cases/consultas_mcp.py](../servicios/ms-ia/app/use_cases/consultas_mcp.py) | 69–150 |
| Auditoría de cada llamada (exitosa/fallida/bloqueada) | [servicios/ms-ia/app/use_cases/mcp_herramientas.py](../servicios/ms-ia/app/use_cases/mcp_herramientas.py) | 23–71 |
| Servidor MCP real (FastMCP, 4 tools) | [servicios/ms-ia/app/adapters/mcp/servidor.py](../servicios/ms-ia/app/adapters/mcp/servidor.py) | 27, 55–95 |
| UI de agentes (Angular) | [aplicaciones/portal-gestion/src/app/paginas/dashboard/dashboard.ts](../aplicaciones/portal-gestion/src/app/paginas/dashboard/dashboard.ts) | 76–80, 125–160 |
| Llamadas HTTP de la UI | [aplicaciones/portal-gestion/src/app/core/datos/gestion-operativa.datos.ts](../aplicaciones/portal-gestion/src/app/core/datos/gestion-operativa.datos.ts) | 387–400 |

**Flujo completo:**
```
Dashboard (Angular) → Pasarela /api/v1/agentes/{id}/ejecutar → ms-ia agentes.py
  → EjecutarAgente._correr()  → ConsultasMcp (vista_mcp_*, auditoria_mcp)
  → decide (umbral/reglas)    → outbox (AlertaCampana → RabbitMQ)
  → BackgroundTask → webhook n8n (adorbit-06) → WhatsApp / correo (Mailpit)
```

### Preguntas probables
- **"¿Por qué es agente y no un simple reporte?"** → Tiene ciclo percibir-decidir-actuar, se ejecuta de forma autónoma, registra cada ejecución (`ejecuciones_agente`) y **actúa** sobre el sistema: emite eventos de dominio y dispara notificaciones.
- **"¿Por qué MCP?"** → Seguridad: la IA nunca hace SQL libre; solo 4 herramientas con parámetros validados, rol de BD `lector_mcp` de solo lectura y todo queda auditado.
- **"¿Qué pasa si se ejecuta dos veces?"** → Idempotencia por `Idempotency-Key`: devuelve la misma ejecución.

---

## PREGUNTA 4A — GraphQL

### Qué decir
"La **pasarela** (Node/Express) expone REST **y** GraphQL con Apollo Server en `/graphql`. GraphQL lo usamos para **agregar datos de varios microservicios en una sola consulta**: una campaña con su cliente (ms-clientes-crm), sus piezas (ms-creatividades), su presupuesto (ms-campanas) y sus facturas (ms-facturacion). El cliente pide **solo los campos que necesita**. También tiene mutaciones: `crearCampana` y `contratarCampana` (que inicia la SAGA)."

### Cómo demostrarlo
1. En el navegador ir a **http://4.151.177.116/explorador-graphql** (página oculta, no está en el menú).
2. Elegir la plantilla **"Campañas (pocos campos)"** → Ejecutar → solo vienen `id` y `nombre`.
3. Elegir **"Campaña + cliente + piezas"** → Ejecutar → en una sola petición trae datos de 3 microservicios.
4. Señalar el estado HTTP y el tiempo en ms.
5. Remarcar: "con REST esto serían 3–4 peticiones; aquí es una y sin datos de más".

### Dónde está el código
| Qué | Archivo | Líneas |
|---|---|---|
| Esquema (tipos, `Query`, `Mutation`) | [plataforma/pasarela/src/esquema.ts](../plataforma/pasarela/src/esquema.ts) | 1–124 (Query 99–104, Mutation 120–123) |
| Resolvers de Query (`campanas`, `campana`, `cliente`, `saga`) | mismo archivo | 189–280 |
| Resolvers de campo que unen microservicios (`presupuesto`, `cliente`, `piezas`, `facturas`) | mismo archivo | 283–400 |
| Mutaciones (`crearCampana`, `contratarCampana` → SAGA) | mismo archivo | 403–470 |
| Montaje de Apollo en `/graphql` (con el JWT en el contexto) | [plataforma/pasarela/src/servidor.ts](../plataforma/pasarela/src/servidor.ts) | 200–220 |
| Página explorador (Angular) | [aplicaciones/portal-gestion/src/app/paginas/explorador-graphql/explorador-graphql.ts](../aplicaciones/portal-gestion/src/app/paginas/explorador-graphql/explorador-graphql.ts) | 82–100 |
| Ruta oculta | [aplicaciones/portal-gestion/src/app/app.routes.ts](../aplicaciones/portal-gestion/src/app/app.routes.ts) | 123 |

```
Explorador (Angular) → POST /graphql (Bearer JWT) → Apollo (pasarela)
  → resolver campana → ms-campanas
       ├─ cliente     → ms-clientes-crm
       ├─ piezas      → ms-creatividades
       └─ facturas    → ms-facturacion
```

---

## PREGUNTA 4C — Machine Learning supervisado y no supervisado

### Qué decir
"Tenemos 3 modelos clásicos (además de YOLO para visión). Se entrenan **en batch** con un script, se guardan como artefactos `.joblib` y se registran en la tabla `modelos_aprendizaje` con sus métricas. ms-ia los carga para inferir en línea."

| Tipo | Modelo | Para qué | Entrada (features) | Métrica |
|---|---|---|---|---|
| **Supervisado** (clasificación) | **XGBoost** `roi_xgboost` | Probabilidad de **impago** de un cliente | proporción de uso de crédito, límite, monto vencido, días de atraso, nº facturas vencidas | exactitud + AUC-ROC |
| **No supervisado** (clustering) | **K-Means (k=3)** `kmeans_campanas` | **Segmentar** campañas activas: bajo consumo / saludable / cerca del límite | presupuesto, gasto, proporción de gasto | coeficiente de silueta |
| **No supervisado** (detección de anomalías) | **Isolation Forest** | Marcar campañas con **gasto anómalo** | presupuesto, gasto | contaminación 5 % |

Diferencia en una frase: **supervisado** aprende de ejemplos etiquetados (sabemos quién pagó y quién no); **no supervisado** no tiene etiquetas, descubre grupos y rarezas por sí solo.

### Cómo demostrarlo
**Supervisado (XGBoost):**
1. Menú **Clientes** → entrar a un cliente (mejor uno moroso).
2. Panel **"Riesgo de impago: ALTO/MEDIO/BAJO"** con la probabilidad y la recomendación. Ese número lo calcula XGBoost en vivo.

**No supervisado (K-Means + Isolation Forest):**
1. Menú **Segmentación ML**.
2. Tarjetas con cuántas campañas cayeron en cada cluster + número de anomalías.
3. Lista: cada campaña con su segmento y la etiqueta **"Anomalía"** con su puntaje.
4. Activar **"Ver solo anomalías"** y luego **Recalcular**.

> Si la lista sale vacía es porque no hay campañas en estado **activa**: activar/contratar un par antes de la defensa.

### Dónde está el código
| Qué | Archivo | Líneas |
|---|---|---|
| **Entrenamiento** de los 3 modelos + registro en BD | [servicios/ms-ia/herramientas/entrenar_modelos_ml.py](../servicios/ms-ia/herramientas/entrenar_modelos_ml.py) | XGBoost 91–118, K-Means 120–145, Isolation Forest 147–174, registro 191–214 |
| Artefactos entrenados | [servicios/ms-ia/app/adapters/ml/artefactos/](../servicios/ms-ia/app/adapters/ml/artefactos/) | `roi_xgboost.joblib`, `kmeans_campanas.joblib`, `isolation_forest_campanas.joblib` |
| Inferencia supervisada (XGBoost `predict_proba`) | [servicios/ms-ia/app/adapters/ml/predictor_riesgo.py](../servicios/ms-ia/app/adapters/ml/predictor_riesgo.py) | 25–41 |
| Inferencia K-Means | [servicios/ms-ia/app/adapters/ml/segmentador_campanas.py](../servicios/ms-ia/app/adapters/ml/segmentador_campanas.py) | 24–30 |
| Inferencia Isolation Forest | [servicios/ms-ia/app/adapters/ml/detector_anomalias.py](../servicios/ms-ia/app/adapters/ml/detector_anomalias.py) | 23+ |
| Caso de uso segmentación (datos vía MCP → modelos) | [servicios/ms-ia/app/use_cases/segmentar_campanas.py](../servicios/ms-ia/app/use_cases/segmentar_campanas.py) | 23–50 |
| Caso de uso riesgo de cliente | [servicios/ms-ia/app/use_cases/predecir_riesgo_cliente.py](../servicios/ms-ia/app/use_cases/predecir_riesgo_cliente.py) | 16+ |
| Endpoints `/api/v1/ml/riesgo-cliente/{id}` y `/api/v1/ml/segmentacion-campanas` | [servicios/ms-ia/app/api/ml.py](../servicios/ms-ia/app/api/ml.py) | 33–52 |
| UI riesgo (supervisado) | [aplicaciones/portal-gestion/src/app/paginas/cliente-detalle/cliente-detalle.html](../aplicaciones/portal-gestion/src/app/paginas/cliente-detalle/cliente-detalle.html) | 70–82 |
| UI segmentación (no supervisado) | [aplicaciones/portal-gestion/src/app/paginas/segmentacion-campanas/](../aplicaciones/portal-gestion/src/app/paginas/segmentacion-campanas/) | — |
| Llamadas HTTP de la UI | [aplicaciones/portal-gestion/src/app/core/datos/gestion-operativa.datos.ts](../aplicaciones/portal-gestion/src/app/core/datos/gestion-operativa.datos.ts) | 360–385 |

```
ENTRENAMIENTO (batch):  entrenar_modelos_ml.py → .joblib + fila en modelos_aprendizaje
INFERENCIA (en línea):  UI → pasarela /api/v1/ml/... → ms-ia ml.py
                         → ConsultasMcp (datos reales) → modelo.predict → JSON → UI
```

### Preguntas probables
- **"¿Con qué datos entrenaron?"** → Con un dataset **sintético** generado con reglas de negocio (600 clientes, 400 campañas), porque el sistema es nuevo y no tiene historial. La arquitectura permite reentrenar con datos reales ejecutando el mismo script. *(Decirlo con honestidad.)*
- **"¿Por qué XGBoost?"** → Funciona muy bien con datos tabulares y pocas features, y da probabilidades calibrables.
- **"¿Cómo eligieron k=3?"** → Por interpretación de negocio (bajo / saludable / cerca del límite), validado con el coeficiente de silueta.

---

## PREGUNTA 4B — Modo offline

### Qué decir
"El offline está en dos clientes:
- **Web (portal de gestión):** service worker que cachea la app, caché de lecturas en el navegador, una **bandeja de salida** que guarda las operaciones hechas sin red y las reenvía al volver, con la **misma `Idempotency-Key`** para que no se dupliquen. Además hay IA local: análisis de imagen y generador de brief que funcionan sin servidor.
- **Móvil (Flutter):** SQLite local con caché de lecturas y bandeja de salida, sincronización en segundo plano con WorkManager (opción solo Wi-Fi) y **modelo YOLO en ONNX dentro del celular**, que detecta el logo sin internet."

### Cómo demostrarlo — Web
> ⚠️ **NO apretar F5 estando sin red.** El sitio se sirve por `http://4.151.177.116` (sin HTTPS) y el navegador solo activa el service worker en HTTPS o `localhost`, así que recargar sin red muestra la página de error de Chrome. Todo lo demás (caché de lecturas, bandeja, sincronización) funciona **navegando por el menú** sin recargar.

1. Con red: entrar a **Campañas**, **Creatividades** (abrir un brief) y **Dashboard** → así se cargan esas pantallas y se guardan sus datos en caché.
2. **Desconectar el Wi-Fi de la laptop.**
3. La barra superior cambia a **"Sin conexión"**.
4. Ir a **Campañas** por el menú lateral → la lista sigue apareciendo (desde caché).
5. En **Creatividades** → crear un brief, subir una pieza o aprobarla → aparece *"📦 Sin red: … guardadas en la bandeja de salida para sincronizar."* → el contador de pendientes sube (clic en la píldora de sincronización para ver la cola).
6. **IA local sin red (web):** en Creatividades → nueva pieza → subir una imagen con el logo → la tarjeta de análisis muestra el motor **"ONNX Runtime Web (YOLOv8n On-Device)"**. El modelo se descargó al entrar a Creatividades con red y quedó en memoria; la imagen nunca sale del navegador.
7. **Reconectar el Wi-Fi** → se sincroniza solo y el contador baja a 0.

### Cómo demostrarlo — Móvil
1. Abrir la lista de briefs con red.
2. Activar **modo avión**.
3. Volver a abrir los briefs → se ven igual (SQLite).
4. Aprobar una pieza → queda en **Cola de sincronización**.
5. **Auditoría de vallas / Validación IA** → tomar una foto → el modelo ONNX local detecta el logo **sin internet**.
6. Quitar el modo avión → la cola se drena sola.

### Dónde está el código
| Qué | Archivo | Líneas |
|---|---|---|
| Servicio offline web (estado de red, caché, bandeja, sincronización) | [aplicaciones/portal-gestion/src/app/core/offline/offline-sync.service.ts](../aplicaciones/portal-gestion/src/app/core/offline/offline-sync.service.ts) | 29–54 (detectar red), 56–80 (caché lecturas), 115–200 (sincronizar), 209–225 (persistir) |
| Service worker (caché de la app y de datos) | [aplicaciones/portal-gestion/public/service-worker.js](../aplicaciones/portal-gestion/public/service-worker.js) | 12–80 |
| Uso de la caché en campañas | [aplicaciones/portal-gestion/src/app/core/datos/campanas.datos.ts](../aplicaciones/portal-gestion/src/app/core/datos/campanas.datos.ts) | 144–150 |
| Uso de la bandeja en creatividades | [aplicaciones/portal-gestion/src/app/paginas/creatividades/creatividades.ts](../aplicaciones/portal-gestion/src/app/paginas/creatividades/creatividades.ts) | 405–417 |
| IA local web (análisis de imagen + brief offline) | [aplicaciones/portal-gestion/src/app/core/ia-local/ia-local-web.service.ts](../aplicaciones/portal-gestion/src/app/core/ia-local/ia-local-web.service.ts) | 49 (imagen), 120–240 (brief local) |
| Indicador "Sin conexión" | [aplicaciones/portal-gestion/src/app/compartido/barra-superior/barra-superior.html](../aplicaciones/portal-gestion/src/app/compartido/barra-superior/barra-superior.html) | 39–50 |
| Móvil: SQLite | [aplicaciones/app-movil/lib/core/datos_locales/sqlite_db.dart](../aplicaciones/app-movil/lib/core/datos_locales/sqlite_db.dart) | — |
| Móvil: caché de lecturas (cache-aside) | [aplicaciones/app-movil/lib/datos/repos/briefs_repo.dart](../aplicaciones/app-movil/lib/datos/repos/briefs_repo.dart) | 13–35 |
| Móvil: bandeja de salida | [aplicaciones/app-movil/lib/core/datos_locales/bandeja_salida_dao.dart](../aplicaciones/app-movil/lib/core/datos_locales/bandeja_salida_dao.dart) | 46–75 |
| Móvil: sincronizador | [aplicaciones/app-movil/lib/core/sync/sincronizador_service.dart](../aplicaciones/app-movil/lib/core/sync/sincronizador_service.dart) | 19–60 |
| Móvil: sincronización en segundo plano (WorkManager) | [aplicaciones/app-movil/lib/core/sync/sincronizacion_background.dart](../aplicaciones/app-movil/lib/core/sync/sincronizacion_background.dart) | 31–75 |
| Móvil: detección de red | [aplicaciones/app-movil/lib/core/red/conectividad_service.dart](../aplicaciones/app-movil/lib/core/red/conectividad_service.dart) | 9–17 |
| Móvil: **YOLO ONNX en el dispositivo** | [aplicaciones/app-movil/lib/core/ia_local/detector_logo_local.dart](../aplicaciones/app-movil/lib/core/ia_local/detector_logo_local.dart) | 37–62 |

```
SIN RED:   acción del usuario → bandeja de salida (localStorage / SQLite) + Idempotency-Key
           lecturas → caché local
CON RED:   evento 'online' / WorkManager → reenviar pendientes con la MISMA Idempotency-Key
           → el backend no duplica (tabla de idempotencia); 409 = conflicto mostrado al usuario
```

### Preguntas probables
- **"¿Qué pasa si se envía dos veces al reconectar?"** → La `Idempotency-Key` se genera al crear la operación offline y se reutiliza en cada reintento; el servidor devuelve la misma respuesta.
- **"¿La IA funciona sin internet?"** → Sí, en ambos: el **mismo modelo YOLO** (`yolo_logo_adorbit.onnx`) corre en el celular (flutter_onnxruntime) y en el navegador (ONNX Runtime Web/WASM, servido desde el propio portal en `/ort/`, sin CDN). Si el runtime no cargara, hay un respaldo heurístico (colores del manual de marca). Código web: `ia-local-web.service.ts` → `precargarModelo()` y `correrOnnxWeb()`.

---

## Resumen de 1 minuto para cerrar
- **P2:** 4 agentes de tarea (Monitor, Cobranza, Visión, Consultor) + 1 agente LLM de reportes. Todos perciben vía **MCP auditado**, deciden y **actúan** (eventos + n8n → WhatsApp/correo). Código: `ms-ia/app/use_cases/ejecutar_agente.py` y `generar_reporte.py`.
- **P4A:** GraphQL en la pasarela (`esquema.ts`), une 4 microservicios en una consulta. Demo en `/explorador-graphql`.
- **P4B:** Offline web (service worker + bandeja con idempotencia) y móvil (SQLite + WorkManager + YOLO ONNX local).
- **P4C:** Supervisado = XGBoost (riesgo de impago, en el detalle del cliente). No supervisado = K-Means + Isolation Forest (Segmentación ML).

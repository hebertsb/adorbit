# app-movil

> Flutter · Riverpod · go_router · SQLite (sqflite) · Responsable: Integrante C

## Alcance
- Gestión de briefs/piezas en campo (listar, detalle, aprobar/rechazar) contra la API real de `ms-creatividades`.
- Captura de piezas con cámara real (`package:camera`) o galería, offline-first: la foto se encola localmente y se sube sola cuando hay red.
- Validación de IA on-device (demo visual por ahora — el modelo TFLite real es tarea 6 de ms-ia, bloqueada por falta de datos de entrenamiento).
- Auditoría de vallas OOH (demo visual — no hay un endpoint real de "vallas" en ningún microservicio todavía; ver `documentacion/05-decisiones-y-pendientes.md`).
- Cola de sincronización real, con conectividad detectada en vivo (`connectivity_plus`) y reintentos en segundo plano (`workmanager`).

## Estructura de código
```
lib/
  core/
    auth/        # SesionController (token Bearer)
    red/          # ApiCliente (HTTP + errores), Entorno (URLs configurables)
    datos_locales/  # SQLite: bandeja_salida_local (outbox), cache_lectura (fallback offline)
    sync/         # SincronizadorService (drena el outbox contra el backend real), workmanager
    tema/         # ColoresAo/TemaAo — mismos tokens que documentacion/diseno/tokens.css
  datos/
    modelos/      # Brief, Pieza (forma real de ms-creatividades), ElementoColaSync
    repos/        # BriefsRepo, ColaSyncRepo
  paginas/        # una carpeta por pantalla
  compartido/     # widgets reusados (TarjetaAo, ChipEstado, BadgeConfianza, NavInferior...)
```

## Correr contra el backend real
Mientras Roly no tenga Keycloak real corriendo, el login usa el mismo emisor de JWT de
prueba que ya usa ms-ia (`servicios/ms-ia/herramientas/emisor_jwt_prueba.py`, genérico
para todo el proyecto vía el parámetro `aud`) — no es un bypass, `ms-creatividades`
verifica el token con su código real (`jose`/`jwtVerify` contra un JWKS), solo que el
JWKS es de juguete.

1. En `servicios/ms-ia/.env`, deja `ADORBIT_IA_JWKS_URI`/`ADORBIT_IA_EMISOR` apuntando
   al emisor (ver su README), y corre `python herramientas/emisor_jwt_prueba.py`.
2. En `servicios/ms-creatividades/.env`, apunta `ADORBIT_CREATIVIDADES_JWKS_URI`/
   `_EMISOR` al mismo emisor (`http://127.0.0.1:8099/certs` / `/prueba`) y completa
   `ADORBIT_CREATIVIDADES_URL_BD` (Mongo Atlas real).
3. `npm run dev` en `servicios/ms-creatividades` (puerto 8083 por defecto).
4. Corre la app:
   - **Emulador Android**: no hace falta nada más — `Entorno` ya usa `10.0.2.2` para
     llegar al equipo anfitrión.
   - **Chrome / escritorio**: tampoco, usa `localhost`.
   - **Dispositivo físico**: pasa la IP LAN real del equipo:
     ```
     flutter run --dart-define=ADORBIT_CREATIVIDADES_BASE_URL=http://192.168.X.X:8083 \
                  --dart-define=ADORBIT_EMISOR_PRUEBA_BASE_URL=http://192.168.X.X:8099
     ```

En la pantalla de login, "Iniciar sesión con Keycloak" pide un token real al emisor de
prueba con el rol `creativo`. El token se guarda en el dispositivo (`shared_preferences`)
y sobrevive a reinicios de la app.

## Offline-first
Cada pieza subida (foto + metadatos) se encola primero en SQLite
(`bandeja_salida_local`, con su propia `Idempotency-Key`) y nunca se pierde si no hay
red. `SincronizadorService` la drena en 3 pasos reales contra `ms-creatividades`: crea
la `Pieza`, pide una URL firmada de Supabase Storage, y sube los bytes directo ahí
(nunca pasan por el backend). Las lecturas (`GET /briefs`, piezas) usan cache-aside:
intentan la red primero y caen a la última respuesta buena guardada en SQLite si falla.

## Definición de terminado
Caso feliz (crear/listar/aprobar) e idempotencia probados en vivo contra `ms-creatividades`
real · contrato al día en `contratos/openapi/ms-creatividades.yaml` · demostrable en la
defensa con datos reales, no solo de muestra.

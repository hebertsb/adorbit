# portal-cliente

> React 19 · TypeScript · Vite · PWA · REST · Responsable: Integrante B

Portal para los **clientes de la agencia**: consultan sus facturas (con pagos), contratos y línea de crédito. Es de
**solo lectura**: el cliente no modifica nada, por eso no necesita bandeja de salida sin conexión (las escrituras son del
portal de gestión).

## Pantallas

| Ruta            | Qué muestra                                                                                                                            | API                                                                                            |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `/` Resumen     | Saldo pendiente por moneda (Bs y US$ nunca se mezclan), facturas vencidas, próximo vencimiento, crédito disponible, contratos vigentes | ms-facturacion `GET /facturas`, ms-clientes-crm `GET /clientes/{id}/credito`, `GET /contratos` |
| `/facturas`     | Lista con filtro por estado y paginación (tarjetas en celular, tabla desde 720 px)                                                     | `GET /facturas?estado=&page=&size=`                                                            |
| `/facturas/:id` | Ítems, totales, pagos recibidos, imprimir                                                                                              | `GET /facturas/{id}`                                                                           |
| `/contratos`    | Contratos del cliente                                                                                                                  | `GET /contratos`                                                                               |
| `/credito`      | Límite, usado, disponible y reservas por campañas en curso                                                                             | `GET /clientes/{id}/credito`                                                                   |
| `/empresa`      | Razón social, NIT y contactos                                                                                                          | `GET /clientes/{id}`                                                                           |

## Seguridad

- **Login OIDC con Authorization Code + PKCE** (`oidc-client-ts`), sin secreto en el navegador. La sesión vive en
  `sessionStorage`: se pierde al cerrar la pestaña.
- Solo entra quien tiene el rol **`cliente`** y un claim **`cliente_id`** en el token. El `cliente_id` sale **solo del
  token**, nunca de la URL ni de un parámetro; los servicios vuelven a validar firma, audiencia y rol, y filtran por el
  `cliente_id` del token. Una factura o cliente ajeno responde 404.
- **Sin conexión**: el service worker guarda las lecturas de las APIs propias (`NetworkFirst`, 24 h). Esa caché es por
  **usuario**: cada petición lleva `_u=<cliente_id del token>` en la URL (los servicios lo ignoran), así dos usuarios del
  mismo navegador nunca comparten una entrada. Además se **borra** al cerrar sesión, al expirar y siempre que el portal
  arranca sin sesión (equipos compartidos), junto con la caché de consultas en memoria.
- **Sesión**: el token se **renueva solo** antes de vencer (`automaticSilentRenew`, con refresh token); si la renovación
  falla se cierra la sesión local. Keycloak debe entregar refresh token al cliente público `portal-cliente`.
- Las respuestas se muestran como texto de React (sin `dangerouslySetInnerHTML`); el dinero viaja como texto decimal y se
  suma en centavos enteros (nunca `float`).
- `nginx.conf` agrega cabeceras de seguridad; en el despliegue conviene sumar una CSP con el `connect-src` real.

## Para Keycloak (Integrante A)

Cliente OIDC **público** `portal-cliente`, flujo _standard_ con PKCE `S256`, redirect URI `https://<portal>/autenticado`,
post-logout `https://<portal>/`, y CORS de ese origen. El access token debe llevar `realm_access.roles` (incluye
`cliente`) y un **mapper** con el claim `cliente_id` (atributo del usuario), con las audiencias `ms-facturacion` y
`ms-clientes-crm`. Los servicios necesitan `…_CORS_ORIGENES` con el origen del portal.

## Variables (se fijan al construir)

| Variable                   | Ejemplo                                |
| -------------------------- | -------------------------------------- |
| `VITE_OIDC_AUTORIDAD`      | `http://localhost:8180/realms/adorbit` |
| `VITE_OIDC_CLIENTE_ID`     | `portal-cliente`                       |
| `VITE_API_FACTURACION_URL` | `http://localhost:8082` (o el gateway) |
| `VITE_API_CRM_URL`         | `http://localhost:8084` (o el gateway) |

Si faltan, el portal muestra una pantalla de «Configuración incompleta» con los nombres que faltan.

## Desarrollo

```bash
npm ci
cp .env.ejemplo .env.local        # completar las VITE_*
npm run dev                        # http://localhost:5173 (sin service worker)
npm run build && npm run preview   # http://localhost:4173 (con PWA)
npm test                           # Vitest + Testing Library
npm run lint && npm run formato:revisar && npx tsc --noEmit
```

Para verlo con datos reales sin Keycloak: levantar los servicios, `node herramientas/keycloak-simulado.mjs`
(con `USUARIOS` de `herramientas/datos-demo.sh`) y abrir el portal; el simulador ofrece «Entrar como …». El
simulador y los servicios deben listar el origen del portal en CORS (`http://localhost:4173` / `:5173`).

### Contenedor

```bash
docker build -t adorbit-portal-cliente \
  --build-arg VITE_OIDC_AUTORIDAD=... --build-arg VITE_API_FACTURACION_URL=... --build-arg VITE_API_CRM_URL=... .
docker run -p 8080:8080 adorbit-portal-cliente      # nginx sin privilegios, /salud, SPA con fallback
```

## Estructura

`src/autenticacion` (OIDC, contexto, token) · `src/api` (cliente REST y consultas de TanStack Query, tipos del
contrato) · `src/paginas` · `src/componentes` · `src/utilidades` (dinero, fechas, resumen) · `src/estilos` (CSS primero
para celular, tema claro/oscuro, impresión) · `src/pruebas` (dobles de OIDC y de la API).
Nota: los _hooks_ se llaman `useXxx` porque React y su linter lo exigen; todo lo demás va en español.

## Responsive (regla 14)

Diseñado desde 360 px: navegación inferior en celular y lateral desde 900 px, tablas que pasan a tarjetas, objetivos
táctiles de 44 px, sin scroll horizontal de la página (solo la fila de filtros desliza). Verificado a 360 px y 1920 px.

## Pendiente

- **Verificar la PWA sin conexión en un Chrome real**: el panel de pruebas usado no permite registrar service workers.
- Campañas del cliente (estado y piezas): falta el contrato de ms-campanas (A) y ms-creatividades (C).
- Pasar de dos URLs de API a la del gateway cuando A lo publique.
- Remoto de BI (`panel-inteligencia`).

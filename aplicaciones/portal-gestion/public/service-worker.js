const CACHE_STATIC = 'adorbit-gestion-estatico-v3';
const CACHE_DATOS = 'adorbit-gestion-datos-v3';
const RECURSOS_ESTATICOS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/configuracion-panel.js',
  '/modelos/yolo_logo_adorbit.onnx',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => {
      return Promise.allSettled(RECURSOS_ESTATICOS.map((url) => cache.add(url)));
    }),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((claves) => {
      return Promise.all(
        claves.map((clave) => {
          if (clave !== CACHE_STATIC && clave !== CACHE_DATOS) {
            return caches.delete(clave);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Nunca interceptar flujos de login OIDC ni mutaciones POST/PUT/DELETE REST
  if (url.pathname.startsWith('/realms/') || url.pathname.startsWith('/resources/')) {
    return;
  }

  // Consultas GET a /api/v1/* -> Network-First con fallback a CACHE_DATOS para soporte offline
  if (req.method === 'GET' && url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(req)
        .then((respuesta) => {
          if (respuesta && respuesta.status === 200) {
            const copia = respuesta.clone();
            caches.open(CACHE_DATOS).then((cache) => cache.put(req, copia));
          }
          return respuesta;
        })
        .catch(() => caches.match(req)),
    );
    return;
  }

  // Solo interceptar GET para archivos estáticos y navegación SPA.
  // /salud es el latido de conectividad: siempre a la red, nunca a la caché.
  if (req.method !== 'GET' || url.pathname === '/salud') {
    return;
  }

  // Assets estáticos (.js, .css, .onnx, iconos, fuentes) y rutas de la SPA -> Network-First con caché dinámica
  event.respondWith(
    fetch(req)
      .then((respuesta) => {
        if (respuesta && respuesta.status === 200 && url.origin === self.location.origin) {
          const copia = respuesta.clone();
          caches.open(CACHE_STATIC).then((cache) => cache.put(req, copia));
        }
        return respuesta;
      })
      .catch(() => {
        return caches.match(req).then((coincidencia) => {
          if (coincidencia) return coincidencia;
          if (req.mode === 'navigate') {
            return caches.match('/index.html') || caches.match('/');
          }
          return Response.error();
        });
      }),
  );
});

const CACHE_NAME = 'adorbit-gestion-v2';
const RECURSOS_ESTATICOS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(RECURSOS_ESTATICOS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((claves) => {
      return Promise.all(
        claves.map((clave) => {
          if (clave !== CACHE_NAME) {
            return caches.delete(clave);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Ignorar llamadas a API REST y GraphQL para mantener datos frescos
  if (event.request.url.includes('/api/') || event.request.url.includes('/graphql') || event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((coincidencia) => {
        return coincidencia || caches.match('/');
      });
    })
  );
});


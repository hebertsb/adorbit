/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  // Solo se guardan sin conexion las lecturas (GET) de las APIs propias; nunca el login (OIDC).
  const origenesApi = [env.VITE_API_FACTURACION_URL, env.VITE_API_CRM_URL]
    .filter((u): u is string => Boolean(u))
    .map((u) => new URL(u).origin);

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'iconos/*.png'],
        manifest: {
          name: 'AdOrbit · Portal del cliente',
          short_name: 'AdOrbit',
          description: 'Consulte sus facturas, contratos y credito en AdOrbit.',
          lang: 'es-BO',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          background_color: '#f6f7fb',
          theme_color: '#4f46e5',
          icons: [
            { src: 'iconos/icono-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'iconos/icono-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'iconos/icono-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/autenticado/],
          runtimeCaching: [
            {
              urlPattern: ({ request, url }) => request.method === 'GET' && origenesApi.includes(url.origin),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-datos',
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 },
                cacheableResponse: { statuses: [200] },
              },
            },
          ],
        },
      }),
    ],
    server: { port: 5173, strictPort: true },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/pruebas/preparar.ts'],
      css: false,
    },
  };
});

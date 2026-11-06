import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Remoto de Module Federation: expone `./montar`, una funcion que NO depende del framework del anfitrion
 * (el contenedor del portal de gestion es Angular): recibe un elemento y un contexto y pinta el panel adentro.
 * React va empaquetado dentro del remoto (no se comparte): el anfitrion no necesita React.
 */
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'panel_inteligencia',
      filename: 'remoteEntry.js',
      exposes: { './montar': './src/montar.tsx' },
      shared: {},
      dts: false,
    }),
  ],
  build: { target: 'esnext' },
  server: { port: 5174, strictPort: true, origin: 'http://localhost:5174', cors: true },
  preview: { port: 4174, strictPort: true, host: '127.0.0.1', cors: true },
});

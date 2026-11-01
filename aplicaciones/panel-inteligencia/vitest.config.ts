import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Las pruebas no cargan el plugin de federacion: solo necesitan React y jsdom.
export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: ['./src/pruebas/preparar.ts'], css: false },
});

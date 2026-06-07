import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  // base './' so the bundle works when loaded from file:// inside Electron
  base: './',
  resolve: {
    alias: {
      // Bundle the shared package from SOURCE so its transitive deps
      // (libsodium-wrappers) are resolved and inlined by Vite instead of
      // leaking into the output as bare module specifiers (which the browser
      // cannot resolve -> blank screen).
      '@msg/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
    },
  },
  optimizeDeps: { include: ['libsodium-wrappers'] },
  server: { port: 5173 },
});

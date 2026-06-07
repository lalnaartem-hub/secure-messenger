import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // base './' so the bundle works when loaded from file:// inside Electron
  base: './',
  server: { port: 5173 },
  optimizeDeps: {
    include: ['libsodium-wrappers', 'libsodium'],
  },
  build: {
    commonjsOptions: {
      include: [/libsodium/, /node_modules/],
    },
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // base './' so the bundle works when loaded from file:// inside Electron
  base: './',
  server: { port: 5173 },
  optimizeDeps: {
    // Force Vite to pre-bundle libsodium-wrappers through esbuild so the
    // relative ./libsodium.mjs sibling import is resolved at dep-optimisation
    // time rather than at Rollup bundle time (where it cannot be found).
    include: ['libsodium-wrappers', 'libsodium'],
    exclude: [],
  },
  build: {
    commonjsOptions: {
      include: [/libsodium/, /node_modules/],
    },
    rollupOptions: {
      // Mark libsodium-wrappers as external so Rollup never attempts to
      // bundle it (and therefore never chases the unresolvable relative
      // ./libsodium.mjs import inside the ESM dist).  The module is loaded
      // from node_modules at runtime where the sibling file is present.
      external: ['libsodium-wrappers'],
      output: {
        globals: {
          'libsodium-wrappers': 'sodium',
        },
      },
    },
  },
});

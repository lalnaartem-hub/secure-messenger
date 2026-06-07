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
  resolve: {
    alias: [
      // libsodium-wrappers ESM build does `import './libsodium.mjs'` which
      // Vite/Rollup cannot resolve because the file is a native WASM-backed
      // module with no corresponding on-disk .mjs artefact in some package
      // versions.  Redirect it to the CJS build that Vite's pre-bundler has
      // already processed and can serve correctly.
      {
        find: /^\.\/libsodium\.mjs$/,
        replacement: 'libsodium-wrappers/dist/modules/libsodium-wrappers.js',
      },
    ],
  },
  build: {
    commonjsOptions: {
      include: [/libsodium/, /node_modules/],
    },
    rollupOptions: {
      // Treat the unresolvable native ESM shard as external so Rollup never
      // tries to bundle it.  The alias above handles it at dev-server time;
      // the external + global pair is the production-build safety net.
      external: ['libsodium.mjs'],
      output: {
        globals: {
          'libsodium.mjs': 'libsodium',
        },
      },
    },
  },
});

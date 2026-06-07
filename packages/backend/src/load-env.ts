import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Load .env into process.env using Node's built-in loader
 * (process.loadEnvFile, available in Node >= 20.12 / 21.7) so we don't need the
 * external `dotenv` package.
 *
 * IMPORTANT: this file must be imported FIRST in main.ts, before AppModule,
 * because some modules read process.env at import time.
 */
const candidates = [
  resolve(process.cwd(), '.env'), // workspace dir when run via npm --workspace
  resolve(__dirname, '..', '.env'), // packages/backend/.env relative to dist/src
  resolve(__dirname, '..', '..', '.env'),
];

const loadEnvFile = (process as unknown as {
  loadEnvFile?: (path: string) => void;
}).loadEnvFile;

let loaded = false;
if (typeof loadEnvFile === 'function') {
  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        loadEnvFile(p);
        // eslint-disable-next-line no-console
        console.log(`[env] loaded ${p}`);
        loaded = true;
        break;
      } catch {
        // try next candidate
      }
    }
  }
}

if (!loaded) {
  // eslint-disable-next-line no-console
  console.warn(
    '[env] no .env loaded — relying on real environment variables. ' +
      '(Need Node >= 20.12 for the built-in loader.)',
  );
}

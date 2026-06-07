import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Pool } from 'pg';

/**
 * Apply the SQL schema on boot. schema.sql is fully idempotent
 * (CREATE EXTENSION/TYPE/TABLE/INDEX ... IF NOT EXISTS), so running it on every
 * start is safe and gives us zero-config provisioning on a fresh managed DB
 * (Railway/Render/Neon) — no separate migration step required.
 */
export async function runMigrations(pool: Pool): Promise<void> {
  const candidates = [
    join(__dirname, 'database', 'schema.sql'), // dist/database/schema.sql (prod)
    join(__dirname, '..', 'src', 'database', 'schema.sql'), // ts-node-dev (dev)
    join(process.cwd(), 'src', 'database', 'schema.sql'),
    join(process.cwd(), 'packages', 'backend', 'src', 'database', 'schema.sql'),
  ];
  const file = candidates.find((p) => existsSync(p));
  if (!file) {
    console.warn('[migrate] schema.sql not found, skipping auto-migration');
    return;
  }
  const sql = readFileSync(file, 'utf8');
  await pool.query(sql);
  console.log('[migrate] schema applied from', file);
}

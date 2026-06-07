import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';

export const PG_POOL = 'PG_POOL';

const connectionString =
  process.env.DATABASE_URL ??
  'postgres://messenger:messenger@localhost:5432/messenger';

// Managed Postgres (Neon, Supabase, Render, etc.) requires TLS. Enable SSL when
// the connection string asks for it; keep it off for plain local Postgres.
const needsSsl =
  /sslmode=require/.test(connectionString) ||
  /\.neon\.tech|\.supabase\.|\.render\.com|\.aws\./.test(connectionString) ||
  process.env.PGSSL === 'true';

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () =>
        new Pool({
          connectionString,
          ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
          max: 20,
          idleTimeoutMillis: 30_000,
        }),
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule {}

import './load-env'; // MUST be first: populates process.env before modules load
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import type { Pool } from 'pg';
import { AppModule } from './app.module';
import { PG_POOL } from './database/database.module';
import { RedisIoAdapter } from './realtime/redis-io.adapter';
import { runMigrations } from './run-migrations';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
    credentials: true,
  });
  // Request validation is done per-route with zod, so no Nest ValidationPipe
  // (which would require class-validator / class-transformer).

  // --- Auto-apply DB schema (idempotent: CREATE ... IF NOT EXISTS) ---
  try {
    await runMigrations(app.get<Pool>(PG_POOL));
  } catch (e) {
    console.error('[migrate] failed:', (e as Error).message);
  }

  // --- Socket.IO Redis adapter (broadcast across instances) ---
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const redisAdapter = new RedisIoAdapter(app);
      await redisAdapter.connectToRedis(redisUrl);
      app.useWebSocketAdapter(redisAdapter);
      console.log('[ws] Redis adapter enabled');
    } catch (e) {
      console.warn('[ws] Redis adapter init failed, using in-memory:', (e as Error).message);
    }
  } else {
    console.log('[ws] REDIS_URL not set — using in-memory adapter (single instance)');
  }

  // --- Serve the built web client (one public URL for app + API + WS) ---
  const clientDir = join(__dirname, '..', 'public');
  if (existsSync(clientDir)) {
    app.useStaticAssets(clientDir);
    const expressApp = app.getHttpAdapter().getInstance();
    // SPA fallback: any non-API GET that is not a file -> index.html
    expressApp.get('*', (req: any, res: any, next: any) => {
      const p: string = req.path;
      if (
        req.method !== 'GET' ||
        p.startsWith('/auth') ||
        p.startsWith('/chats') ||
        p.startsWith('/crypto') ||
        p.startsWith('/users') ||
        p.startsWith('/messages') ||
        p.startsWith('/socket.io') ||
        p.includes('.')
      ) {
        return next();
      }
      res.sendFile(join(clientDir, 'index.html'));
    });
    console.log('[web] serving client from', clientDir);
  } else {
    console.log('[web] no client build at', clientDir, '(API-only mode)');
  }

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  console.log(`[backend] listening on :${port}`);
}
bootstrap();

import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS = 'REDIS';

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      useFactory: () => {
        const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
        const client = new Redis(url, {
          maxRetriesPerRequest: null,
          retryStrategy: (times) => Math.min(times * 300, 3000),
        });
        // Always attach an error handler, otherwise ioredis throws
        // "Unhandled error event" and can crash the process.
        client.on('error', (e: Error) => console.error('[redis] error:', e.message));
        client.on('connect', () => console.log('[redis] connected'));
        return client;
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}

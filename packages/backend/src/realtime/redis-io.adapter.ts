import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import type { ServerOptions } from 'socket.io';

/**
 * Socket.IO adapter backed by Redis pub/sub so broadcasts reach clients
 * connected to any backend instance (horizontal scaling).
 *
 * Uses ioredis (already a dependency). ioredis connects lazily/automatically,
 * so there is no explicit .connect() call like with node-redis.
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor!: ReturnType<typeof createAdapter>;

  async connectToRedis(url: string): Promise<void> {
    const pubClient = new Redis(url, {
      maxRetriesPerRequest: null,
      retryStrategy: (times) => Math.min(times * 300, 3000),
    });
    const subClient = pubClient.duplicate();
    // Error handlers prevent "Unhandled error event" crashes on transient drops.
    pubClient.on('error', (e: Error) => console.error('[redis-adapter] pub error:', e.message));
    subClient.on('error', (e: Error) => console.error('[redis-adapter] sub error:', e.message));
    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, {
      ...options,
      cors: { origin: process.env.CORS_ORIGIN?.split(',') ?? true, credentials: true },
    });
    server.adapter(this.adapterConstructor);
    return server;
  }
}

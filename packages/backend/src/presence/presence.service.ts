import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS } from '../redis/redis.module';

/**
 * Presence + socket registry in Redis.
 * Keys:
 *   ws:user:{userId}      SET of "{socketId}#{nodeId}"  (multi-tab / multi-device)
 *   ws:socket:{socketId}  HASH { userId, nodeId }
 *   presence:{userId}     STRING "online" with heartbeat TTL
 *   typing:{chatId}:{uid} STRING "1" EX 5
 */
@Injectable()
export class PresenceService {
  private readonly nodeId = process.env.NODE_ID ?? `node-${process.pid}`;
  private readonly PRESENCE_TTL = 30;
  private readonly TYPING_TTL = 5;

  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async addSocket(userId: string, socketId: string) {
    const member = `${socketId}#${this.nodeId}`;
    await this.redis
      .multi()
      .sadd(`ws:user:${userId}`, member)
      .hset(`ws:socket:${socketId}`, { userId, nodeId: this.nodeId })
      .set(`presence:${userId}`, 'online', 'EX', this.PRESENCE_TTL)
      .exec();
  }

  async removeSocket(socketId: string) {
    const meta = await this.redis.hgetall(`ws:socket:${socketId}`);
    if (!meta?.userId) return { userId: null, stillOnline: false };
    const member = `${socketId}#${meta.nodeId}`;
    await this.redis
      .multi()
      .srem(`ws:user:${meta.userId}`, member)
      .del(`ws:socket:${socketId}`)
      .exec();
    const remaining = await this.redis.scard(`ws:user:${meta.userId}`);
    return { userId: meta.userId, stillOnline: remaining > 0 };
  }

  async heartbeat(userId: string) {
    await this.redis.set(`presence:${userId}`, 'online', 'EX', this.PRESENCE_TTL);
  }

  async isOnline(userIds: string[]): Promise<Record<string, boolean>> {
    if (userIds.length === 0) return {};
    const keys = userIds.map((u) => `presence:${u}`);
    const values = await this.redis.mget(keys);
    return Object.fromEntries(userIds.map((u, i) => [u, values[i] === 'online']));
  }

  async setTyping(chatId: string, userId: string) {
    await this.redis.set(`typing:${chatId}:${userId}`, '1', 'EX', this.TYPING_TTL);
  }
}

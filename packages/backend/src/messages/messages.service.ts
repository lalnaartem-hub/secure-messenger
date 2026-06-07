import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { v7 as uuidv7 } from 'uuid';
import Redis from 'ioredis';
import { PG_POOL } from '../database/database.module';
import { REDIS } from '../redis/redis.module';

export interface PersistInput {
  chatId: string;
  senderId: string;
  clientMsgId: string;
  ciphertext: string;
  cryptoEnvelope: Record<string, unknown>;
  kind: 'text' | 'image' | 'file';
  replyToId?: string;
}

@Injectable()
export class MessagesService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  /**
   * Idempotent insert. On retry the unique (chat_id, sender_id, client_msg_id)
   * constraint makes ON CONFLICT DO NOTHING return no row; we then fetch the
   * existing message and re-ACK it (exactly-once at the DB layer).
   */
  async persist(input: PersistInput) {
    const id = uuidv7();
    const insert = await this.pool.query(
      `INSERT INTO messages (id, chat_id, sender_id, kind, content, crypto_envelope, reply_to_id, client_msg_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (chat_id, sender_id, client_msg_id) DO NOTHING
       RETURNING id, chat_id, sender_id, kind, content, crypto_envelope, reply_to_id, client_msg_id, created_at`,
      [
        id,
        input.chatId,
        input.senderId,
        input.kind,
        input.ciphertext,
        input.cryptoEnvelope,
        input.replyToId ?? null,
        input.clientMsgId,
      ],
    );

    let row = insert.rows[0];
    if (!row) {
      const existing = await this.pool.query(
        `SELECT id, chat_id, sender_id, kind, content, crypto_envelope, reply_to_id, client_msg_id, created_at
         FROM messages WHERE chat_id=$1 AND sender_id=$2 AND client_msg_id=$3`,
        [input.chatId, input.senderId, input.clientMsgId],
      );
      row = existing.rows[0];
    } else {
      await this.pool.query(
        `UPDATE chats SET last_message_id=$1, last_message_at=now(), updated_at=now() WHERE id=$2`,
        [row.id, input.chatId],
      );
      await this.cacheRecent(input.chatId, row);
    }
    return this.toDto(row);
  }

  /** Read-through cache of the last 50 ciphertext messages (ring buffer). */
  private async cacheRecent(chatId: string, row: any) {
    const key = `chat:${chatId}:recent`;
    await this.redis
      .multi()
      .lpush(key, JSON.stringify(this.toDto(row)))
      .ltrim(key, 0, 49)
      .expire(key, 3600)
      .exec();
  }

  async history(chatId: string, before?: { createdAt: string; id: string }, limit = 50) {
    if (!before) {
      const cached = await this.redis.lrange(`chat:${chatId}:recent`, 0, limit - 1);
      if (cached.length > 0) return cached.map((c) => JSON.parse(c));
    }
    const { rows } = await this.pool.query(
      `SELECT id, chat_id, sender_id, kind, content, crypto_envelope, reply_to_id, client_msg_id, created_at
       FROM messages
       WHERE chat_id = $1 AND ($2::timestamptz IS NULL OR (created_at, id) < ($2, $3))
       ORDER BY created_at DESC, id DESC
       LIMIT $4`,
      [chatId, before?.createdAt ?? null, before?.id ?? null, limit],
    );
    return rows.map((r) => this.toDto(r));
  }

  async markRead(messageId: string, userId: string) {
    await this.pool.query(
      `INSERT INTO message_receipts (message_id, user_id, status)
       VALUES ($1, $2, 'read')
       ON CONFLICT (message_id, user_id)
       DO UPDATE SET status='read', updated_at=now()`,
      [messageId, userId],
    );
  }

  private toDto(r: any) {
    return {
      id: r.id,
      chatId: r.chat_id,
      senderId: r.sender_id,
      kind: r.kind,
      ciphertext: r.content,
      cryptoEnvelope: r.crypto_envelope,
      replyToId: r.reply_to_id,
      clientMsgId: r.client_msg_id,
      createdAt: r.created_at,
    };
  }
}

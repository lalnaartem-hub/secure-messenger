import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

type ChatType = 'direct' | 'group' | 'channel';

@Injectable()
export class ChatsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(creatorId: string, dto: { type: ChatType; title?: string; memberIds: string[] }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO chats (type, title, created_by) VALUES ($1, $2, $3) RETURNING id, type, title, created_at`,
        [dto.type, dto.title ?? null, creatorId],
      );
      const chat = rows[0];
      const members = Array.from(new Set([creatorId, ...dto.memberIds]));
      for (const userId of members) {
        await client.query(
          `INSERT INTO chat_participants (chat_id, user_id, role)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [chat.id, userId, userId === creatorId ? 'owner' : 'member'],
        );
      }
      await client.query('COMMIT');
      return chat;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async listForUser(userId: string) {
    const { rows } = await this.pool.query(
      `SELECT c.id, c.type, c.title, c.avatar_url, c.last_message_at,
              COALESCE(
                (
                  SELECT json_agg(
                    json_build_object(
                      'id', u.id,
                      'username', u.username,
                      'displayName', u.display_name,
                      'avatarUrl', u.avatar_url,
                      'publicIdentityKey', u.public_identity_key
                    )
                  )
                  FROM chat_participants cp
                  JOIN users u ON u.id = cp.user_id
                  WHERE cp.chat_id = c.id
                ),
                '[]'::json
              ) as participants
       FROM chats c
       JOIN chat_participants p ON p.chat_id = c.id
       WHERE p.user_id = $1
       ORDER BY c.last_message_at DESC NULLS LAST`,
      [userId],
    );
    return rows;
  }

  async isMember(chatId: string, userId: string) {
    const { rowCount } = await this.pool.query(
      `SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
      [chatId, userId],
    );
    return rowCount! > 0;
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import type { OAuthProfile } from '../auth/auth.service';

@Injectable()
export class UsersService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async upsertFromOAuth(p: OAuthProfile) {
    const { rows } = await this.pool.query(
      `INSERT INTO users (username, email, display_name, avatar_url, oauth_provider, oauth_subject)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (oauth_provider, oauth_subject)
       DO UPDATE SET display_name = EXCLUDED.display_name,
                     avatar_url   = EXCLUDED.avatar_url,
                     updated_at   = now()
       RETURNING id, username, email, display_name, avatar_url`,
      [p.username, p.email, p.displayName ?? null, p.avatarUrl ?? null, p.provider, p.subject],
    );
    return rows[0];
  }

  async setIdentityKey(userId: string, publicIdentityKey: string) {
    await this.pool.query(`UPDATE users SET public_identity_key = $2 WHERE id = $1`, [
      userId,
      publicIdentityKey,
    ]);
  }

  async getPublicProfile(userId: string) {
    const { rows } = await this.pool.query(
      `SELECT id, username, display_name, avatar_url, public_identity_key, last_seen_at
       FROM users WHERE id = $1`,
      [userId],
    );
    return rows[0] ?? null;
  }
}

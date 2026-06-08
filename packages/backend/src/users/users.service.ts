import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import type { OAuthProfile } from '../auth/auth.service';

@Injectable()
export class UsersService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async upsertFromOAuth(p: OAuthProfile) {
    try {
      // 1. Check if user already exists with this email
      const emailQuery = await this.pool.query(
        `SELECT id, username, email, display_name, avatar_url FROM users WHERE email = $1`,
        [p.email],
      );
      if (emailQuery.rows[0]) {
        return emailQuery.rows[0];
      }

      // 2. Check if user already exists with this username
      const usernameQuery = await this.pool.query(
        `SELECT id, username, email, display_name, avatar_url FROM users WHERE username = $1`,
        [p.username],
      );
      if (usernameQuery.rows[0]) {
        return usernameQuery.rows[0];
      }

      // 3. Insert new user if no unique conflicts
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
    } catch (err) {
      console.error('[auth-upsert] Database error during OAuth login upsert:', err);
      throw err;
    }
  }

  async setIdentityKey(userId: string, publicIdentityKey: string) {
    await this.pool.query(`UPDATE users SET public_identity_key = $2 WHERE id = $1`, [
      userId,
      publicIdentityKey,
    ]);
  }

  async updateProfile(userId: string, update: { displayName?: string; avatarUrl?: string; bio?: string }) {
    const fields: string[] = [];
    const values: any[] = [userId];
    let idx = 2;
    if (update.displayName !== undefined) {
      fields.push(`display_name = $${idx++}`);
      values.push(update.displayName);
    }
    if (update.avatarUrl !== undefined) {
      fields.push(`avatar_url = $${idx++}`);
      values.push(update.avatarUrl);
    }
    if (update.bio !== undefined) {
      fields.push(`bio = $${idx++}`);
      values.push(update.bio);
    }
    if (fields.length === 0) return;
    await this.pool.query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = now() WHERE id = $1`,
      values,
    );
  }

  async getPublicProfile(userId: string) {
    const { rows } = await this.pool.query(
      `SELECT id, username, display_name, avatar_url, public_identity_key, bio, last_seen_at
       FROM users WHERE id = $1`,
      [userId],
    );
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      username: r.username,
      displayName: r.display_name,
      avatarUrl: r.avatar_url,
      publicIdentityKey: r.public_identity_key,
      bio: r.bio,
      lastSeenAt: r.last_seen_at,
    };
  }

  async listAll(excludeUserId: string) {
    const { rows } = await this.pool.query(
      `SELECT id, username, display_name, avatar_url, public_identity_key, bio, last_seen_at
       FROM users WHERE id != $1
       ORDER BY username ASC`,
      [excludeUserId],
    );
    return rows.map((r) => ({
      id: r.id,
      username: r.username,
      displayName: r.display_name,
      avatarUrl: r.avatar_url,
      publicIdentityKey: r.public_identity_key,
      bio: r.bio,
      lastSeenAt: r.last_seen_at,
    }));
  }
}

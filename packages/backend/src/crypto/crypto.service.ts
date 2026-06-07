import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

/**
 * Key-distribution service for X3DH-style E2E. The server is a "dumb" key
 * directory: it stores PUBLIC identity keys + one-time prekeys and hands them
 * out. It never sees private keys or plaintext.
 */
@Injectable()
export class CryptoService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async uploadPrekeys(userId: string, prekeys: { prekeyPublic: string; signature: string }[]) {
    const values: any[] = [];
    const tuples = prekeys.map((pk, i) => {
      values.push(userId, pk.prekeyPublic, pk.signature);
      return `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`;
    });
    await this.pool.query(
      `INSERT INTO user_prekeys (user_id, prekey_public, signature) VALUES ${tuples.join(',')}`,
      values,
    );
  }

  /** Atomically claim one unused prekey for a peer (consumed = true). */
  async claimPrekey(peerId: string) {
    const { rows } = await this.pool.query(
      `UPDATE user_prekeys SET consumed = true
       WHERE id = (
         SELECT id FROM user_prekeys
         WHERE user_id = $1 AND consumed = false
         ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED
       )
       RETURNING prekey_public, signature`,
      [peerId],
    );
    return rows[0] ?? null;
  }
}

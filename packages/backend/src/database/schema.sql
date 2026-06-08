-- ============================================================
-- secure-messenger :: PostgreSQL schema (Phase 1)
-- True E2E: `content` always stores ciphertext; server never decrypts.
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

DO $$ BEGIN
  CREATE TYPE chat_type   AS ENUM ('direct', 'group', 'channel');
  CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member');
  CREATE TYPE msg_kind    AS ENUM ('text', 'image', 'file', 'system');
  CREATE TYPE receipt_st  AS ENUM ('delivered', 'read');
  CREATE TYPE oauth_prov  AS ENUM ('google', 'github');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ---------------- USERS ----------------
CREATE TABLE IF NOT EXISTS users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username            CITEXT NOT NULL UNIQUE,
    email               CITEXT NOT NULL UNIQUE,
    display_name        TEXT,
    avatar_url          TEXT,
    oauth_provider      oauth_prov NOT NULL,
    oauth_subject       TEXT NOT NULL,
    -- E2E: long-term public identity key (Ed25519/X25519, base64). Private key
    -- NEVER leaves the client. Server stores only the public half.
    public_identity_key TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at        TIMESTAMPTZ,
    UNIQUE (oauth_provider, oauth_subject)
);

-- ---------------- E2E PREKEYS (X3DH-style key distribution) ----------------
-- Clients upload a batch of one-time prekeys; server hands them out so two
-- devices can derive a shared secret without the server learning it.
CREATE TABLE IF NOT EXISTS user_prekeys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prekey_public   TEXT NOT NULL,
    signature       TEXT NOT NULL,
    consumed        BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prekeys_user_unconsumed
    ON user_prekeys (user_id) WHERE consumed = false;

-- ---------------- CHATS ----------------
CREATE TABLE IF NOT EXISTS chats (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type                chat_type NOT NULL,
    title               TEXT,
    avatar_url          TEXT,
    created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_message_id     UUID,
    last_message_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_chats_last_message_at
    ON chats (last_message_at DESC NULLS LAST);

-- ---------------- CHAT_PARTICIPANTS ----------------
CREATE TABLE IF NOT EXISTS chat_participants (
    chat_id              UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role                 member_role NOT NULL DEFAULT 'member',
    joined_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_read_message_id UUID,
    muted_until          TIMESTAMPTZ,
    PRIMARY KEY (chat_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_participants_user ON chat_participants (user_id);

-- ---------------- MESSAGES ----------------
CREATE TABLE IF NOT EXISTS messages (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- replace w/ uuidv7 in app layer
    chat_id          UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id        UUID REFERENCES users(id) ON DELETE SET NULL,
    kind             msg_kind NOT NULL DEFAULT 'text',
    content          TEXT,          -- CIPHERTEXT (base64). Server cannot read it.
    crypto_envelope  JSONB,         -- { v, ephemeralPubKey, nonce, prekeyId, ... }
    reply_to_id      UUID REFERENCES messages(id) ON DELETE SET NULL,
    client_msg_id    UUID NOT NULL, -- idempotency token from client
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    edited_at        TIMESTAMPTZ,
    deleted_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_messages_chat_created
    ON messages (chat_id, created_at DESC, id DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_messages_idempotency
    ON messages (chat_id, sender_id, client_msg_id);
CREATE INDEX IF NOT EXISTS brin_messages_created
    ON messages USING BRIN (created_at) WITH (pages_per_range = 32);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to
    ON messages (reply_to_id) WHERE reply_to_id IS NOT NULL;

-- ---------------- MESSAGE_RECEIPTS ----------------
CREATE TABLE IF NOT EXISTS message_receipts (
    message_id   UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    status       receipt_st NOT NULL,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (message_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_receipts_user_status
    ON message_receipts (user_id, status);

-- Migration/Add reactions column to messages if not exists
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;

-- Migration/Add bio column to users if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;


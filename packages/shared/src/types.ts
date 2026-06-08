export type ChatType = 'direct' | 'group' | 'channel';
export type MessageKind = 'text' | 'image' | 'file' | 'system';

export interface CryptoEnvelope {
  v: number;                 // crypto scheme version
  ephemeralPubKey?: string;  // base64 X25519 ephemeral public key
  nonce: string;             // base64 nonce
  prekeyId?: string;         // claimed one-time prekey id (X3DH)
}

export interface WireMessage {
  id: string;
  chatId: string;
  senderId: string;
  kind: MessageKind;
  ciphertext: string;        // base64 ciphertext (server NEVER decrypts)
  cryptoEnvelope: CryptoEnvelope;
  replyToId?: string | null;
  clientMsgId: string;
  createdAt: string;
}

export interface KeyBundle {
  identityKey: string | null;
  prekey: { prekey_public: string; signature: string } | null;
}

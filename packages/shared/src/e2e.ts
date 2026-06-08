import _sodium from 'libsodium-wrappers';
import type { CryptoEnvelope } from './types';

/**
 * Minimal E2E primitives using libsodium.
 *
 * Scheme (v1):
 *   - Each user has a long-term X25519 identity keypair (private stays on device).
 *   - To send, we derive a shared secret via crypto_box (sealed/box) between the
 *     sender's ephemeral key and the recipient's public key, then AEAD-encrypt
 *     the plaintext. The server only ever stores/relays the ciphertext + envelope.
 *
 * For production-grade forward secrecy you would layer the Double Ratchet on top;
 * the envelope/version field is designed to allow that upgrade.
 */
let ready: Promise<typeof _sodium> | null = null;
async function sodium() {
  if (!ready) ready = _sodium.ready.then(() => _sodium);
  return ready;
}

export async function generateIdentityKeyPair() {
  const s = await sodium();
  const kp = s.crypto_box_keypair();
  return {
    publicKey: s.to_base64(kp.publicKey),
    privateKey: s.to_base64(kp.privateKey),
  };
}

export async function encryptFor(
  recipientPublicKeyB64: string,
  plaintext: string,
  myPrivateKeyB64: string,
): Promise<{ ciphertext: string; envelope: CryptoEnvelope }> {
  const s = await sodium();
  const recipientPk = s.from_base64(recipientPublicKeyB64);
  const mySk = s.from_base64(myPrivateKeyB64);
  const sharedKey = s.crypto_box_beforenm(recipientPk, mySk);
  const nonce = s.randombytes_buf(s.crypto_box_NONCEBYTES);
  const ciphertext = s.crypto_box_easy_afternm(
    s.from_string(plaintext),
    nonce,
    sharedKey,
  );
  return {
    ciphertext: s.to_base64(ciphertext),
    envelope: {
      v: 2,
      nonce: s.to_base64(nonce),
    },
  };
}

export async function decryptFrom(
  myPrivateKeyB64: string,
  peerPublicKeyB64: string,
  ciphertextB64: string,
  envelope: CryptoEnvelope,
): Promise<string> {
  const s = await sodium();
  const peerPk = s.from_base64(peerPublicKeyB64);
  const mySk = s.from_base64(myPrivateKeyB64);

  // Backwards compatibility: if it is a legacy version 1 message, decrypt using legacy scheme
  if (envelope.v === 1 && envelope.ephemeralPubKey) {
    const plain = s.crypto_box_open_easy(
      s.from_base64(ciphertextB64),
      s.from_base64(envelope.nonce),
      s.from_base64(envelope.ephemeralPubKey),
      mySk,
    );
    return s.to_string(plain);
  }

  const sharedKey = s.crypto_box_beforenm(peerPk, mySk);
  const plain = s.crypto_box_open_easy_afternm(
    s.from_base64(ciphertextB64),
    s.from_base64(envelope.nonce),
    sharedKey,
  );
  return s.to_string(plain);
}

const crypto = require('crypto');

// Password-based AES-256-GCM using Node built-in scrypt (no new dependency).
// Output: { encrypted: base64(iv|tag|ciphertext), salt: hex, params }
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LEN = 32;

function encryptPayload(plaintext, password) {
  if (!password) return null;
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(String(password), salt, KEY_LEN, SCRYPT_OPTS);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, tag, ciphertext]).toString('base64');
  key.fill(0);
  return {
    encrypted: combined,
    salt: salt.toString('hex'),
    kdf: { name: 'scrypt', N: SCRYPT_OPTS.N, r: SCRYPT_OPTS.r, p: SCRYPT_OPTS.p },
    alg: 'AES-256-GCM',
  };
}

function decryptPayload(bundle, password) {
  const { encrypted, salt, kdf } = bundle;
  if (!encrypted || !salt) throw new Error('Missing encryption metadata.');
  const raw = Buffer.from(encrypted, 'base64');
  if (raw.length < 12 + 16 + 1) throw new Error('Encrypted payload too short.');
  if (raw.length > 100 * 1024 * 1024) throw new Error('Encrypted payload exceeds safe limit.');
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const opts = kdf && kdf.name === 'scrypt'
    ? { N: kdf.N || SCRYPT_OPTS.N, r: kdf.r || 8, p: kdf.p || 1, maxmem: SCRYPT_OPTS.maxmem }
    : SCRYPT_OPTS;
  const key = crypto.scryptSync(String(password), Buffer.from(salt, 'hex'), KEY_LEN, opts);
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } finally {
    key.fill(0);
  }
}

module.exports = { encryptPayload, decryptPayload };

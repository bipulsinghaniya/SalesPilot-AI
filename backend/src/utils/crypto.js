import crypto from 'crypto';
import { env } from '../config/env.js';

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateRandomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function getEncryptionKey() {
  if (env.encryptionKey && env.encryptionKey.length === 64) {
    return Buffer.from(env.encryptionKey, 'hex');
  }
  return crypto.createHash('sha256').update(env.jwtSecret).digest();
}

export function encryptSecret(plainText) {
  if (!plainText) return '';
  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSecret(cipherText) {
  if (!cipherText || !cipherText.includes(':')) return '';
  const [ivHex, tagHex, dataHex] = cipherText.split(':');
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}

export function maskSecret(value) {
  if (!value) return '';
  const str = String(value);
  if (str.length <= 6) return '******';
  return `${str.slice(0, 3)}***${str.slice(-3)}`;
}

export function maskEmail(email) {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  const maskedLocal = local.length <= 2 ? `${local[0] || '*'}*` : `${local.slice(0, 2)}***`;
  return `${maskedLocal}@${domain}`;
}

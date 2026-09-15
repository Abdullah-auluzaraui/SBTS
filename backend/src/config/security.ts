export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || (process.env.NODE_ENV !== 'test' && Buffer.byteLength(secret) < 32)) {
    throw new Error('JWT_SECRET must be configured with at least 32 bytes');
  }
  return secret;
}

export function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('ENCRYPTION_KEY is required');
  if (/^[a-fA-F0-9]{64}$/.test(key)) return Buffer.from(key, 'hex');
  if (Buffer.byteLength(key) === 32) return Buffer.from(key, 'utf8');
  throw new Error('ENCRYPTION_KEY must contain 64 hex characters or exactly 32 UTF-8 bytes');
}

export function assertDemoDatabase(): void {
  const uri = process.env.MONGO_URI || '';
  const database = uri.split('?')[0].split('/').pop() || '';
  if (process.env.DEMO_MODE !== 'true' || !/(^|[_-])demo($|[_-])/i.test(database)) {
    throw new Error('Demo seeding requires DEMO_MODE=true and a database name containing a demo segment');
  }
}

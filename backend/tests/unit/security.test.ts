import { assertDemoDatabase, getEncryptionKey, getJwtSecret } from '../../src/config/security';

describe('required security configuration', () => {
  const originalEnv = { ...process.env };
  afterEach(() => { process.env = { ...originalEnv }; });

  it('rejects missing JWT secrets and short non-test secrets', () => {
    delete process.env.JWT_SECRET;
    expect(getJwtSecret).toThrow();
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'secret';
    expect(getJwtSecret).toThrow();
  });

  it('rejects absent, malformed and incorrectly sized encryption keys', () => {
    for (const key of ['', 'default-key', 'z'.repeat(64)]) {
      process.env.ENCRYPTION_KEY = key;
      expect(getEncryptionKey).toThrow();
    }
    process.env.ENCRYPTION_KEY = 'ab'.repeat(32);
    expect(getEncryptionKey()).toHaveLength(32);
  });

  it('blocks demo seeding unless enabled on a dedicated demo database', () => {
    process.env.MONGO_URI = 'mongodb://localhost/SBTS';
    process.env.DEMO_MODE = 'true';
    expect(assertDemoDatabase).toThrow();
    process.env.MONGO_URI = 'mongodb://localhost/SBTS_DEMO?retryWrites=true';
    expect(assertDemoDatabase).not.toThrow();
    delete process.env.DEMO_MODE;
    expect(assertDemoDatabase).toThrow();
  });
});

// tests/auth.test.js
const { validatePassword, hashPassword } = require('../src/auth/users');

describe('Auth', () => {
  test('hashes password correctly', async () => {
    const hash = await hashPassword('testpass123');
    expect(hash).not.toBe('testpass123');
    expect(hash.length).toBeGreaterThan(20);
  });

  test('validates correct password', async () => {
    const hash = await hashPassword('testpass123');
    const isValid = await validatePassword('testpass123', hash);
    expect(isValid).toBe(true);
  });

  test('rejects wrong password', async () => {
    const hash = await hashPassword('testpass123');
    const isValid = await validatePassword('wrongpass', hash);
    expect(isValid).toBe(false);
  });
});

// tests/webhook.test.js
const crypto = require('crypto');
const { verifySignature, parseWebhookPayload, findBrandForRepo } = require('../src/routes/webhook');

describe('Webhook', () => {
  const secret = 'test-secret';

  test('verifies valid signature', () => {
    const payload = JSON.stringify({ test: 'data' });
    const signature = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const result = verifySignature(payload, signature, secret);
    expect(result).toBe(true);
  });

  test('rejects invalid signature', () => {
    const payload = JSON.stringify({ test: 'data' });
    const signature = 'sha256=invalid';

    const result = verifySignature(payload, signature, secret);
    expect(result).toBe(false);
  });

  test('rejects missing signature', () => {
    const payload = JSON.stringify({ test: 'data' });
    const result = verifySignature(payload, null, secret);
    expect(result).toBe(false);
  });

  test('parses push event payload correctly', () => {
    const payload = {
      ref: 'refs/heads/main',
      repository: {
        name: 'lp-brand1-promo',
        full_name: 'org/lp-brand1-promo'
      }
    };

    const result = parseWebhookPayload(payload);
    expect(result.repoName).toBe('lp-brand1-promo');
    expect(result.branch).toBe('main');
    expect(result.fullName).toBe('org/lp-brand1-promo');
  });

  test('parses payload with different branch', () => {
    const payload = {
      ref: 'refs/heads/develop',
      repository: {
        name: 'main-brand1',
        full_name: 'org/main-brand1'
      }
    };

    const result = parseWebhookPayload(payload);
    expect(result.repoName).toBe('main-brand1');
    expect(result.branch).toBe('develop');
  });

  describe('findBrandForRepo', () => {
    test('finds brand for main site repo', () => {
      const result = findBrandForRepo('main-brand1');
      expect(result).not.toBeNull();
      expect(result.brand.id).toBe('brand1');
      expect(result.type).toBe('main');
      expect(result.slug).toBeNull();
    });

    test('finds brand for LP repo', () => {
      const result = findBrandForRepo('lp-brand1-promo');
      expect(result).not.toBeNull();
      expect(result.brand.id).toBe('brand1');
      expect(result.type).toBe('lp');
      expect(result.slug).toBe('promo');
    });

    test('finds brand for brand2 LP repo', () => {
      const result = findBrandForRepo('lp-brand2-summer-sale');
      expect(result).not.toBeNull();
      expect(result.brand.id).toBe('brand2');
      expect(result.type).toBe('lp');
      expect(result.slug).toBe('summer-sale');
    });

    test('returns null for unknown repo', () => {
      const result = findBrandForRepo('unknown-repo');
      expect(result).toBeNull();
    });
  });
});

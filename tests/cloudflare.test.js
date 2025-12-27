// tests/cloudflare.test.js
const CloudflareService = require('../src/services/cloudflare');

describe('CloudflareService', () => {
  test('constructs with zone IDs', () => {
    const cf = new CloudflareService('token', {
      'brand1.com': 'zone1',
      'brand2.com': 'zone2'
    });
    expect(cf.getZoneId('brand1.com')).toBe('zone1');
  });

  test('returns null for unknown domain', () => {
    const cf = new CloudflareService('token', {});
    expect(cf.getZoneId('unknown.com')).toBeNull();
  });

  test('builds correct purge URLs for LP', () => {
    const cf = new CloudflareService('token', {
      'brand1.com': 'zone1'
    });
    const urls = cf.buildPurgeUrls('brand1.com', 'lp', 'promo');
    expect(urls).toContain('https://brand1.com/lp/promo/');
    expect(urls).toContain('https://brand1.com/lp/promo/index.html');
  });

  test('builds null purge URLs for main site (purge everything)', () => {
    const cf = new CloudflareService('token', {
      'brand1.com': 'zone1'
    });
    const urls = cf.buildPurgeUrls('brand1.com', 'main');
    expect(urls).toBeNull();
  });
});

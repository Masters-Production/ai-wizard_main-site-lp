// tests/config.test.js
const config = require('../src/config');

describe('Config', () => {
  test('loads brands configuration', () => {
    expect(config.brands).toHaveLength(2);
    expect(config.brands[0]).toHaveProperty('id');
    expect(config.brands[0]).toHaveProperty('domain');
  });

  test('has GitHub configuration', () => {
    expect(config.github).toHaveProperty('org');
  });

  test('has paths configuration', () => {
    expect(config.paths).toHaveProperty('www');
    expect(config.paths).toHaveProperty('preview');
    expect(config.paths).toHaveProperty('builds');
  });
});

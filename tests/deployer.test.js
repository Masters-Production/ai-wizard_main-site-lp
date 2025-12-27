// tests/deployer.test.js
const path = require('path');
const DeployerService = require('../src/services/deployer');

describe('DeployerService', () => {
  let deployer;
  const wwwPath = '/var/www';
  const previewPath = '/var/www/preview';

  beforeEach(() => {
    deployer = new DeployerService(wwwPath, previewPath);
  });

  test('generates correct preview path for LP', () => {
    const previewPathResult = deployer.getPreviewPath('brand1', 'lp', 'promo');
    expect(previewPathResult).toBe(path.join(previewPath, 'brand1', 'lp', 'promo'));
  });

  test('generates correct preview path for main site', () => {
    const previewPathResult = deployer.getPreviewPath('brand1', 'main');
    expect(previewPathResult).toBe(path.join(previewPath, 'brand1', 'main'));
  });

  test('generates correct live path for LP', () => {
    const livePath = deployer.getLivePath('brand1.com', 'lp', 'promo');
    expect(livePath).toBe(path.join(wwwPath, 'brand1.com', 'lp', 'promo'));
  });

  test('generates correct live path for main site', () => {
    const livePath = deployer.getLivePath('brand1.com', 'main');
    expect(livePath).toBe(path.join(wwwPath, 'brand1.com'));
  });
});

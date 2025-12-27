// tests/builder.test.js
const path = require('path');
const BuilderService = require('../src/services/builder');

describe('BuilderService', () => {
  let builder;
  const buildsPath = '/tmp/builds';

  beforeEach(() => {
    builder = new BuilderService(buildsPath);
  });

  test('generates correct build path', () => {
    const buildPath = builder.getBuildPath('my-repo');
    expect(buildPath).toBe(path.join(buildsPath, 'my-repo'));
  });

  test('generates correct output path', () => {
    const outputPath = builder.getOutputPath('my-repo');
    expect(outputPath).toBe(path.join(buildsPath, 'my-repo', 'dist'));
  });
});

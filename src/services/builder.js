// src/services/builder.js
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const util = require('util');

const execAsync = util.promisify(exec);

class BuilderService {
  constructor(buildsPath) {
    this.buildsPath = buildsPath;
  }

  getBuildPath(repoName) {
    return path.join(this.buildsPath, repoName);
  }

  getOutputPath(repoName) {
    return path.join(this.getBuildPath(repoName), 'dist');
  }

  async clone(repoUrl, repoName) {
    const buildPath = this.getBuildPath(repoName);

    // Remove existing if present
    await fs.rm(buildPath, { recursive: true, force: true });

    // Clone fresh
    await execAsync(`git clone --depth 1 ${repoUrl} ${buildPath}`);

    return buildPath;
  }

  async install(repoName) {
    const buildPath = this.getBuildPath(repoName);
    await execAsync('npm install', { cwd: buildPath });
  }

  async build(repoName) {
    const buildPath = this.getBuildPath(repoName);
    await execAsync('npm run build', { cwd: buildPath });
    return this.getOutputPath(repoName);
  }

  async fullBuild(repoUrl, repoName) {
    await this.clone(repoUrl, repoName);
    await this.install(repoName);
    return await this.build(repoName);
  }
}

module.exports = BuilderService;

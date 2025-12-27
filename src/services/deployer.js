// src/services/deployer.js
const path = require('path');
const fs = require('fs').promises;

class DeployerService {
  constructor(wwwPath, previewPath) {
    this.wwwPath = wwwPath;
    this.previewPath = previewPath;
  }

  getPreviewPath(brandId, type, slug = null) {
    if (type === 'main') {
      return path.join(this.previewPath, brandId, 'main');
    }
    return path.join(this.previewPath, brandId, 'lp', slug);
  }

  getLivePath(domain, type, slug = null) {
    if (type === 'main') {
      return path.join(this.wwwPath, domain);
    }
    return path.join(this.wwwPath, domain, 'lp', slug);
  }

  async deploy(sourcePath, targetPath) {
    // Ensure target directory exists
    await fs.mkdir(targetPath, { recursive: true });

    // Copy files (preserve lp folder for main site deploys)
    await this.copyDir(sourcePath, targetPath);
  }

  async copyDir(src, dest) {
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await fs.mkdir(destPath, { recursive: true });
        await this.copyDir(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  async promoteToLive(previewPath, livePath, preserveLpFolder = false) {
    if (preserveLpFolder) {
      // For main site: backup lp folder, deploy, restore lp folder
      const lpPath = path.join(livePath, 'lp');
      const lpBackup = path.join(livePath, '_lp_backup');

      try {
        await fs.rename(lpPath, lpBackup);
      } catch (e) {
        // lp folder might not exist
      }

      await this.deploy(previewPath, livePath);

      try {
        await fs.rm(path.join(livePath, 'lp'), { recursive: true, force: true });
        await fs.rename(lpBackup, lpPath);
      } catch (e) {
        // Restore failed or no backup
      }
    } else {
      await this.deploy(previewPath, livePath);
    }
  }

  async remove(targetPath) {
    await fs.rm(targetPath, { recursive: true, force: true });
  }
}

module.exports = DeployerService;

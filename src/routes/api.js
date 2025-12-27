// src/routes/api.js
const express = require('express');
const router = express.Router();
const config = require('../config');
const GitHubService = require('../services/github');
const BuilderService = require('../services/builder');
const DeployerService = require('../services/deployer');

const github = new GitHubService(config.github.token, config.github.org);
const builder = new BuilderService(config.paths.builds);
const deployer = new DeployerService(config.paths.www, config.paths.preview);

// Get all repos for a brand
router.get('/brands/:brandId/repos', async (req, res) => {
  try {
    const brand = config.brands.find(b => b.id === req.params.brandId);
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    const allRepos = await github.listRepos();
    const lpRepos = github.filterByPrefix(allRepos, brand.lpRepoPrefix);

    const lps = lpRepos.map(repo => ({
      name: repo.name,
      slug: github.extractSlug(repo.name, brand.lpRepoPrefix),
      url: repo.html_url,
      updatedAt: repo.updated_at
    }));

    res.json({
      mainSiteRepo: brand.mainSiteRepo,
      landingPages: lps
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deploy to preview
router.post('/deploy/preview', async (req, res) => {
  try {
    const { brandId, type, repoName, slug } = req.body;

    const brand = config.brands.find(b => b.id === brandId);
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    // Clone and build
    const repoUrl = `https://github.com/${config.github.org}/${repoName}.git`;
    const outputPath = await builder.fullBuild(repoUrl, repoName);

    // Deploy to preview
    const previewPath = deployer.getPreviewPath(brandId, type, slug);
    await deployer.deploy(outputPath, previewPath);

    const previewUrl = type === 'main'
      ? `https://${brand.previewDomain}/`
      : `https://${brand.previewDomain}/lp/${slug}/`;

    res.json({
      success: true,
      previewUrl,
      message: `Deployed to preview: ${previewUrl}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Promote to live
router.post('/deploy/live', async (req, res) => {
  try {
    const { brandId, type, slug } = req.body;

    const brand = config.brands.find(b => b.id === brandId);
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    const previewPath = deployer.getPreviewPath(brandId, type, slug);
    const livePath = deployer.getLivePath(brand.domain, type, slug);

    const preserveLp = type === 'main';
    await deployer.promoteToLive(previewPath, livePath, preserveLp);

    const liveUrl = type === 'main'
      ? `https://${brand.domain}/`
      : `https://${brand.domain}/lp/${slug}/`;

    res.json({
      success: true,
      liveUrl,
      message: `Published to live: ${liveUrl}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unpublish from live
router.post('/deploy/unpublish', async (req, res) => {
  try {
    const { brandId, type, slug } = req.body;

    const brand = config.brands.find(b => b.id === brandId);
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    const livePath = deployer.getLivePath(brand.domain, type, slug);
    await deployer.remove(livePath);

    res.json({
      success: true,
      message: 'Unpublished from live'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

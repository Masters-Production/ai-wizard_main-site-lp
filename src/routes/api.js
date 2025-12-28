// src/routes/api.js
const express = require('express');
const router = express.Router();
const config = require('../config');
const GitHubService = require('../services/github');
const BuilderService = require('../services/builder');
const DeployerService = require('../services/deployer');
const CloudflareService = require('../services/cloudflare');

const github = new GitHubService(config.github.token, config.github.org);
const builder = new BuilderService(config.paths.builds);
const deployer = new DeployerService(config.paths.www, config.paths.preview);
const cloudflare = new CloudflareService(
  config.cloudflare.apiToken,
  config.cloudflare.zoneIds
);

// Get all repos for a brand
router.get('/brands/:brandId/repos', async (req, res) => {
  try {
    console.log('API: Fetching repos for brand:', req.params.brandId);
    const brand = config.brands.find(b => b.id === req.params.brandId);
    if (!brand) {
      console.log('API: Brand not found:', req.params.brandId);
      return res.status(404).json({ error: 'Brand not found' });
    }
    console.log('API: Brand found:', brand.name, 'LP prefix:', brand.lpRepoPrefix);

    const allRepos = await github.listRepos();
    console.log('API: Total repos:', allRepos.length);
    const lpRepos = github.filterByPrefix(allRepos, brand.lpRepoPrefix);
    console.log('API: Filtered LPs:', lpRepos.length);

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
    console.log('Deploy preview:', { brandId, type, repoName, slug });

    const brand = config.brands.find(b => b.id === brandId);
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    // Clone and build
    const repoUrl = `https://github.com/${config.github.org}/${repoName}.git`;
    console.log('Cloning:', repoUrl);
    const outputPath = await builder.fullBuild(repoUrl, repoName);
    console.log('Build output:', outputPath);

    // Deploy to preview
    const previewPath = deployer.getPreviewPath(brandId, type, slug);
    console.log('Deploying to:', previewPath);
    await deployer.deploy(outputPath, previewPath);

    const previewUrl = type === 'main'
      ? `https://${brand.previewDomain}/`
      : `https://${brand.previewDomain}/lp/${slug}/`;

    console.log('Deploy success:', previewUrl);
    res.json({
      success: true,
      previewUrl,
      message: `Deployed to preview: ${previewUrl}`
    });
  } catch (error) {
    console.error('Deploy error:', error);
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

    // Purge Cloudflare cache after successful deployment
    const purgeResult = await cloudflare.purgeSite(brand.domain, type, slug);
    if (!purgeResult.success) {
      console.log(`Cloudflare cache purge skipped/failed: ${purgeResult.reason || purgeResult.error || 'Unknown error'}`);
    }

    const liveUrl = type === 'main'
      ? `https://${brand.domain}/`
      : `https://${brand.domain}/lp/${slug}/`;

    res.json({
      success: true,
      liveUrl,
      message: `Published to live: ${liveUrl}`,
      cachePurged: purgeResult.success
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

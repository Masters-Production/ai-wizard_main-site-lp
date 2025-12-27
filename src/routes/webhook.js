// src/routes/webhook.js
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const config = require('../config');
const GitHubService = require('../services/github');
const BuilderService = require('../services/builder');
const DeployerService = require('../services/deployer');

const github = new GitHubService(config.github.token, config.github.org);
const builder = new BuilderService(config.paths.builds);
const deployer = new DeployerService(config.paths.www, config.paths.preview);

// Verify GitHub webhook signature
function verifySignature(payload, signature, secret) {
  if (!signature) return false;

  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch (e) {
    // timingSafeEqual throws if buffers have different lengths
    return false;
  }
}

// Parse webhook payload
function parseWebhookPayload(payload) {
  const repoName = payload.repository?.name;
  const fullName = payload.repository?.full_name;
  const branch = payload.ref?.replace('refs/heads/', '');

  return { repoName, fullName, branch };
}

// Find which brand this repo belongs to
function findBrandForRepo(repoName) {
  for (const brand of config.brands) {
    // Check if it's main site
    if (repoName === brand.mainSiteRepo) {
      return { brand, type: 'main', slug: null };
    }
    // Check if it's an LP
    if (repoName.startsWith(brand.lpRepoPrefix)) {
      const slug = repoName.replace(brand.lpRepoPrefix, '');
      return { brand, type: 'lp', slug };
    }
  }
  return null;
}

// GitHub webhook endpoint (no auth required, uses signature)
router.post('/github', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const event = req.headers['x-github-event'];

  // Verify signature
  if (!verifySignature(req.body.toString(), signature, config.github.webhookSecret)) {
    console.log('Webhook: Invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Only handle push events
  if (event !== 'push') {
    console.log(`Webhook: Ignoring event type: ${event}`);
    return res.json({ message: `Ignored event: ${event}` });
  }

  try {
    const payload = JSON.parse(req.body.toString());
    const { repoName, branch } = parseWebhookPayload(payload);

    console.log(`Webhook: Push received for ${repoName} (${branch})`);

    // Find brand for this repo
    const match = findBrandForRepo(repoName);
    if (!match) {
      console.log(`Webhook: No brand match for repo ${repoName}`);
      return res.json({ message: 'Repo not configured for auto-deploy' });
    }

    const { brand, type, slug } = match;
    console.log(`Webhook: Auto-deploying ${type} for ${brand.id}${slug ? ` (${slug})` : ''}`);

    // Clone and build
    const repoUrl = `https://github.com/${config.github.org}/${repoName}.git`;
    const outputPath = await builder.fullBuild(repoUrl, repoName);

    // Deploy to preview only (not live!)
    const previewPath = deployer.getPreviewPath(brand.id, type, slug);
    await deployer.deploy(outputPath, previewPath);

    const previewUrl = type === 'main'
      ? `https://${brand.previewDomain}/`
      : `https://${brand.previewDomain}/lp/${slug}/`;

    console.log(`Webhook: Auto-deployed to preview: ${previewUrl}`);

    res.json({
      success: true,
      message: 'Auto-deployed to preview',
      previewUrl,
      repo: repoName,
      brand: brand.id,
      type
    });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export for testing
module.exports = router;
module.exports.verifySignature = verifySignature;
module.exports.parseWebhookPayload = parseWebhookPayload;
module.exports.findBrandForRepo = findBrandForRepo;

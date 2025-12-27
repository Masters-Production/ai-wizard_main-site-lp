# LP Publisher

A simple dashboard for publishing landing pages and websites from GitHub to your VPS.

## Features

- Deploy main sites and landing pages from GitHub
- Preview before going live
- Support for multiple brands/domains
- Simple authentication
- Nginx static file serving

## Quick Start

1. Clone this repo to your server
2. Copy `.env.example` to `.env` and configure
3. Run `./scripts/setup-server.sh`
4. Access dashboard at `http://admin.yourdomain.com`

## Configuration

See `.env.example` for all configuration options.

## Workflow

1. Create LP in Lovable
2. Sync to GitHub
3. Open dashboard
4. Click "Deploy Preview"
5. Verify preview
6. Click "Go Live"

## Tech Stack

- Node.js + Express
- Passport.js (auth)
- Octokit (GitHub API)
- Nginx (static serving)
- PM2 (process management)

## Auto-Deploy Setup (GitHub Webhooks)

When you push changes to GitHub, the system automatically rebuilds and deploys to **preview**.
Live deployment still requires manual "Go Live" click.

### Configure GitHub Webhook

1. Go to your GitHub repo -> Settings -> Webhooks -> Add webhook
2. Configure:
   - **Payload URL:** `https://admin.yourdomain.com/webhook/github`
   - **Content type:** `application/json`
   - **Secret:** Same as `GITHUB_WEBHOOK_SECRET` in your `.env`
   - **Events:** Select "Just the push event"
3. Save

### Workflow with Auto-Deploy

1. Make changes in Lovable
2. Lovable pushes to GitHub
3. **Automatically:** Preview updates
4. Check preview at `preview.domain.com`
5. Click "Go Live" when ready

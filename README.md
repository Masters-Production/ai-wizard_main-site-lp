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

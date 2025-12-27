// src/config/index.js
const brands = require('./brands');

module.exports = {
  port: process.env.PORT || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret',

  github: {
    token: process.env.GITHUB_TOKEN,
    org: process.env.GITHUB_ORG || 'Masters-Production',
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || 'change-me'
  },

  brands,

  paths: {
    www: process.env.WWW_PATH || '/var/www',
    preview: process.env.PREVIEW_PATH || '/var/www/preview',
    builds: process.env.BUILDS_PATH || '/tmp/lp-builds'
  },

  cloudflare: {
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
    zoneIds: {
      [process.env.BRAND1_DOMAIN || 'brand1.local']: process.env.CLOUDFLARE_ZONE_BRAND1,
      [process.env.BRAND2_DOMAIN || 'brand2.local']: process.env.CLOUDFLARE_ZONE_BRAND2
    }
  }
};

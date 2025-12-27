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
  }
};

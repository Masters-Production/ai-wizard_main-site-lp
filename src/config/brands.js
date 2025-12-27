// src/config/brands.js
module.exports = [
  {
    id: 'brand1',
    name: 'Brand 1',
    domain: process.env.BRAND1_DOMAIN || 'brand1.local',
    previewDomain: process.env.BRAND1_PREVIEW_DOMAIN || 'preview.brand1.local',
    mainSiteRepo: process.env.BRAND1_MAIN_REPO || 'main-brand1',
    lpRepoPrefix: 'lp-brand1-'
  },
  {
    id: 'brand2',
    name: 'Brand 2',
    domain: process.env.BRAND2_DOMAIN || 'brand2.local',
    previewDomain: process.env.BRAND2_PREVIEW_DOMAIN || 'preview.brand2.local',
    mainSiteRepo: process.env.BRAND2_MAIN_REPO || 'main-brand2',
    lpRepoPrefix: 'lp-brand2-'
  }
];

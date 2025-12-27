// src/services/cloudflare.js

class CloudflareService {
  constructor(apiToken, zoneIds) {
    this.apiToken = apiToken;
    this.zoneIds = zoneIds; // { 'domain.com': 'zoneId' }
    this.baseUrl = 'https://api.cloudflare.com/client/v4';
  }

  getZoneId(domain) {
    return this.zoneIds[domain] || null;
  }

  buildPurgeUrls(domain, type, slug = null) {
    if (type === 'main') {
      // Purge everything for main site
      return null;
    }
    // Purge specific LP paths
    return [`https://${domain}/lp/${slug}/`, `https://${domain}/lp/${slug}/index.html`];
  }

  async purgeCache(domain, paths = null) {
    const zoneId = this.getZoneId(domain);
    if (!zoneId) {
      console.log(`Cloudflare: No zone ID for ${domain}, skipping purge`);
      return { success: false, reason: 'No zone ID configured' };
    }

    const url = `${this.baseUrl}/zones/${zoneId}/purge_cache`;

    // If paths specified, purge specific files; otherwise purge all
    const body = paths
      ? { files: paths }
      : { purge_everything: true };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        console.log(`Cloudflare: Cache purged for ${domain}`);
        return { success: true };
      } else {
        console.error(`Cloudflare: Purge failed for ${domain}`, data.errors);
        return { success: false, errors: data.errors };
      }
    } catch (error) {
      console.error(`Cloudflare: Error purging ${domain}`, error);
      return { success: false, error: error.message };
    }
  }

  // Purge specific LP or main site
  async purgeSite(domain, type, slug = null) {
    const urls = this.buildPurgeUrls(domain, type, slug);
    return this.purgeCache(domain, urls);
  }
}

module.exports = CloudflareService;

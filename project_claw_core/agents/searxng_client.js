/**
 * SearXNG client (self-hosted, free forever)
 * Set SEARXNG_URL env var, e.g. http://localhost:8080
 */

class SearxngClient {
  constructor(baseUrl = process.env.SEARXNG_URL) {
    this.baseUrl = (baseUrl || '').replace(/\/$/, '');
  }

  isAvailable() {
    return Boolean(this.baseUrl);
  }

  async search(query, count = 5) {
    if (!this.baseUrl) return [];
    try {
      const https = require('https');
      const http = this.baseUrl.startsWith('https') ? https : require('http');
      const encoded = encodeURIComponent(query);
      const url = `${this.baseUrl}/search?q=${encoded}&format=json`;

      const res = await new Promise((resolve, reject) => {
        const req = http.get(url, { timeout: 15000 }, resolve);
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('SearXNG timeout')); });
      });

      let data = '';
      res.on('data', chunk => data += chunk);
      await new Promise((resolve, reject) => {
        res.on('end', resolve);
        res.on('error', reject);
      });

      const parsed = JSON.parse(data);
      return (parsed.results || []).slice(0, count).map(r => ({
        title: r.title || '',
        link: r.url || r.link || '',
        snippet: r.content || r.snippet || r.abstract || ''
      }));
    } catch (e) {
      return [];
    }
  }
}

module.exports = { SearxngClient };

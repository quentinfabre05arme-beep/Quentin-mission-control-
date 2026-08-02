/**
 * Brave Search client (optional; free $5 credits/month)
 * Set BRAVE_API_KEY env var to enable.
 */

class BraveSearch {
  constructor(apiKey = process.env.BRAVE_API_KEY) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.search.brave.com/res/v1/web/search';
  }

  isAvailable() {
    return Boolean(this.apiKey);
  }

  async search(query, count = 5) {
    if (!this.apiKey) return [];
    try {
      const https = require('https');
      const encoded = encodeURIComponent(query);
      const url = `${this.baseUrl}?q=${encoded}&count=${count}&offset=0`;

      const res = await new Promise((resolve, reject) => {
        const req = https.request(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': this.apiKey
          },
          timeout: 15000
        }, resolve);
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Brave timeout')); });
        req.end();
      });

      let data = '';
      res.on('data', chunk => data += chunk);
      await new Promise((resolve, reject) => {
        res.on('end', resolve);
        res.on('error', reject);
      });

      const parsed = JSON.parse(data);
      return (parsed.web?.results || []).map(r => ({
        title: r.title || '',
        link: r.url || '',
        snippet: r.description || ''
      }));
    } catch (e) {
      return [];
    }
  }
}

module.exports = { BraveSearch };

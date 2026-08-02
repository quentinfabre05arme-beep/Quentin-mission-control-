/**
 * Tavily Search client (optional; free tier 1,000 searches/month)
 * Set TAVILY_API_KEY env var to enable.
 */

class TavilySearch {
  constructor(apiKey = process.env.TAVILY_API_KEY) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.tavily.com';
  }

  isAvailable() {
    return Boolean(this.apiKey);
  }

  async search(query, maxResults = 5) {
    if (!this.apiKey) return [];
    try {
      const https = require('https');
      const payload = JSON.stringify({
        api_key: this.apiKey,
        query,
        search_depth: 'basic',
        max_results: maxResults,
        include_answer: false,
        include_raw_content: false
      });

      const res = await new Promise((resolve, reject) => {
        const req = https.request(`${this.baseUrl}/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          },
          timeout: 15000
        }, resolve);
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Tavily timeout')); });
        req.write(payload);
        req.end();
      });

      let data = '';
      res.on('data', chunk => data += chunk);
      await new Promise((resolve, reject) => {
        res.on('end', resolve);
        res.on('error', reject);
      });

      const parsed = JSON.parse(data);
      return (parsed.results || []).map(r => ({
        title: r.title || '',
        link: r.url || '',
        snippet: r.content || r.snippet || ''
      }));
    } catch (e) {
      return [];
    }
  }
}

module.exports = { TavilySearch };

/**
 * BRAVE SEARCH CLIENT v1.0
 * Uses Brave Web Search API. Free tier: 2,000 requests/month.
 * Requires BRAVE_API_KEY environment variable.
 */

const https = require('https');

function search(query, { count = 5, timeoutMs = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.BRAVE_API_KEY || (typeof process !== 'undefined' && process.env.BRAVE_API_KEY);
    if (!apiKey) {
      return resolve({ source: 'brave', results: [], error: 'BRAVE_API_KEY not set' });
    }

    const encoded = encodeURIComponent(query);
    const req = https.get({
      hostname: 'api.search.brave.com',
      path: `/res/v1/web/search?q=${encoded}&count=${count}`,
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': apiKey
      },
      timeout: timeoutMs
    }, res => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return resolve({ source: 'brave', results: [], error: `HTTP ${res.statusCode}` });
        }
        try {
          const parsed = JSON.parse(data);
          const results = (parsed.results || []).map(r => ({
            title: r.title || r.name || query,
            link: r.url || '',
            snippet: r.description || '',
            source: 'brave'
          }));
          resolve({ source: 'brave', results });
        } catch (e) {
          resolve({ source: 'brave', results: [], error: e.message });
        }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', e => reject(e));
  });
}

module.exports = { search };

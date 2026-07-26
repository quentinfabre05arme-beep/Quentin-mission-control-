/**
 * Web Search Proxy
 * Uses Serper.dev API directly (bypasses broken web_search tool)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load API key from secrets
function getApiKey() {
  try {
    const secrets = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '.openclaw', 'secrets.json'), 'utf8'));
    return secrets['serper-api'] || secrets.serper;
  } catch (e) {
    console.warn('No secrets file, using default');
    return '1a32d04a8215dde72b67e554c94409ce580094f3';
  }
}

class WebSearchProxy {
  constructor() {
    this.apiKey = getApiKey();
    this.baseUrl = 'api.serper.dev';
  }

  async search(query, options = {}) {
    const { type = 'search', numResults = 10 } = options;
    
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        q: query,
        num: numResults
      });

      const options = {
        hostname: this.baseUrl,
        path: `/${type}`,
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            resolve({
              query,
              results: result.organic || [],
              related: result.relatedSearches || [],
              timestamp: new Date().toISOString()
            });
          } catch (e) {
            reject(new Error('Invalid JSON response: ' + e.message));
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  async news(query, options = {}) {
    return this.search(query, { ...options, type: 'news' });
  }

  async images(query, options = {}) {
    return this.search(query, { ...options, type: 'images' });
  }
}

module.exports = WebSearchProxy;

// CLI usage
if (require.main === module) {
  const searcher = new WebSearchProxy();
  const query = process.argv[2] || 'Bitcoin price today';
  
  console.log('🔍 Searching: ' + query);
  searcher.search(query)
    .then(results => {
      console.log('\nResults:');
      results.results.slice(0, 5).forEach((r, i) => {
        console.log(`${i + 1}. ${r.title}`);
        console.log(`   ${r.link}`);
        console.log(`   ${r.snippet?.substring(0, 100)}...`);
        console.log();
      });
    })
    .catch(err => console.error('Error:', err.message));
}

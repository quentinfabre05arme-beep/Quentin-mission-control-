/**
 * OpenSERP Client — local self-hosted SERP API client
 * Requires OpenSERP running locally on port 7000.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'openserp_client.log');
const CACHE_DIR = path.join(__dirname, '..', 'memory', 'research_cache');
const CACHE_TTL_MS = 60 * 60 * 1000;

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
  console.log(`[OpenSERP] ${msg}`);
}

function getCacheFile(query) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const safe = query.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 80);
  return path.join(CACHE_DIR, `openserp_${safe}.json`);
}

function loadCache(query) {
  const file = getCacheFile(query);
  if (!fs.existsSync(file)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (Date.now() - new Date(data.timestamp).getTime() > CACHE_TTL_MS) return null;
    log(`Cache hit: ${query}`);
    return data.results;
  } catch(e) { return null; }
}

function saveCache(query, results) {
  fs.writeFileSync(getCacheFile(query), JSON.stringify({ results, timestamp: new Date().toISOString() }, null, 2));
}

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const req = client.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpGetJson(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

class OpenSerpClient {
  constructor(baseUrl = 'http://127.0.0.1:7000') {
    this.baseUrl = baseUrl;
  }

  async isAvailable(timeoutMs = 3000) {
    return new Promise((resolve) => {
      httpGetJson(`${this.baseUrl}/`).then(() => resolve(true)).catch(() => resolve(false));
      setTimeout(() => resolve(false), timeoutMs);
    });
  }

  async search(query, engines = ['bing', 'duckduckgo'], count = 5) {
    const cached = loadCache(query);
    if (cached) return cached;

    log(`OpenSERP search: ${query}`);
    const url = `${this.baseUrl}/mega/search?engines=${engines.join(',')}&text=${encodeURIComponent(query)}&mode=any&extract=1`;

    try {
      const json = await httpGetJson(url);
      const results = (json.results || []).slice(0, count).map(r => ({
        title: r.title,
        link: r.url,
        snippet: r.description || r.snippet || '',
        source: 'openserp',
        full_text: r.extracted_content || ''
      }));
      if (results.length > 0) saveCache(query, results);
      return results;
    } catch(e) {
      log(`OpenSERP error: ${e.message}`);
      return [];
    }
  }

  async research(query, engines = ['bing', 'duckduckgo'], count = 5) {
    return await this.search(query, engines, count);
  }
}

module.exports = { OpenSerpClient };

if (require.main === module) {
  const client = new OpenSerpClient();
  client.isAvailable().then(ok => {
    console.log(`OpenSERP available: ${ok}`);
    if (ok) {
      return client.research('bitcoin price today', ['bing', 'duckduckgo'], 3);
    }
    return [];
  }).then(r => {
    console.log(JSON.stringify(r, null, 2));
  }).catch(e => console.error(e));
}

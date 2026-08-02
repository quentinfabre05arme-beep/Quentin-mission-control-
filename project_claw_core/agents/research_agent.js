/**
 * PROJECT CLAW CORE — Research Agent
 * Web search + content extraction using Serper and direct fetch.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'research_agent.log');
const CACHE_DIR = path.join(__dirname, '..', 'memory', 'research_cache');
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function getCacheFile(query) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const safe = query.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 80);
  return path.join(CACHE_DIR, `${safe}.json`);
}

function loadCache(query) {
  const file = getCacheFile(query);
  if (!fs.existsSync(file)) return null;
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (Date.now() - new Date(data.timestamp).getTime() > CACHE_TTL_MS) return null;
  return data.results;
}

function saveCache(query, results) {
  fs.writeFileSync(getCacheFile(query), JSON.stringify({ results, timestamp: new Date().toISOString() }, null, 2));
}

function getSerperKey() {
  try {
    // Try to read from credential manager or env
    if (process.env.SERPER_API_KEY) return process.env.SERPER_API_KEY;
    // Fallback: read from .env style file
    const envFile = path.join(__dirname, '..', '..', '.env');
    if (fs.existsSync(envFile)) {
      const lines = fs.readFileSync(envFile, 'utf8').split('\n');
      for (const line of lines) {
        if (line.startsWith('SERPER_API_KEY=')) {
          return line.split('=')[1].trim();
        }
      }
    }
    // Fallback: OpenClaw secret ref pattern
    return '{{secret:serper-api}}';
  } catch(e) {
    return null;
  }
}

async function searchWeb(query, count = 5) {
  const cached = loadCache(query);
  if (cached) {
    log(`Cache hit for: ${query}`);
    return cached;
  }
  
  const apiKey = getSerperKey();
  if (!apiKey || apiKey.includes('secret:')) {
    log('No Serper API key available');
    return [];
  }
  
  log(`Searching: ${query}`);
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ q: query, num: count });
    const req = https.request({
      hostname: 'google.serper.dev',
      path: '/search',
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: 15000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const results = (json.organic || []).map(r => ({
            title: r.title,
            link: r.link,
            snippet: r.snippet,
            date: r.date
          }));
          saveCache(query, results);
          resolve(results);
        } catch(e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(data);
    req.end();
  });
}

async function fetchPageText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 15000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchPageText(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Strip HTML tags crudely
        const text = data.replace(/<script[^\u003e]*>[\s\S]*?\u003c\/script>/gi, ' ')
                         .replace(/<style[^\u003e]*>[\s\S]*?\u003c\/style>/gi, ' ')
                         .replace(/\u003c[^\u003e]*>/g, ' ')
                         .replace(/\s+/g, ' ')
                         .trim();
        resolve(text.slice(0, 5000));
      });
    }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
  });
}

class ResearchAgent {
  constructor() {}
  
  async search(query, count = 5) {
    return await searchWeb(query, count);
  }
  
  async summarize(url) {
    log(`Summarizing: ${url}`);
    const text = await fetchPageText(url);
    // Return first ~1000 chars as summary
    return {
      url,
      summary: text.slice(0, 1000),
      full_length: text.length
    };
  }
  
  async research(query, count = 5) {
    const results = await this.search(query, count);
    const enriched = [];
    for (const r of results.slice(0, 3)) {
      try {
        const summary = await this.summarize(r.link);
        enriched.push({ ...r, ...summary });
      } catch(e) {
        enriched.push({ ...r, summary: '', error: e.message });
      }
    }
    return enriched;
  }
}

module.exports = { ResearchAgent, searchWeb, fetchPageText };

if (require.main === module) {
  (async () => {
    const agent = new ResearchAgent();
    const results = await agent.search('bitcoin price today', 3);
    console.log(JSON.stringify(results, null, 2));
  })();
}

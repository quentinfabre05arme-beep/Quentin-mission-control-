/**
 * Research Agent v2 — multi-source web search with fallback chain
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'research_agent.log');
const CACHE_DIR = path.join(__dirname, '..', 'memory', 'research_cache');
const CACHE_TTL_MS = 60 * 60 * 1000;

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
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (Date.now() - new Date(data.timestamp).getTime() > CACHE_TTL_MS) return null;
    return data.results;
  } catch(e) { return null; }
}

function saveCache(query, results) {
  fs.writeFileSync(getCacheFile(query), JSON.stringify({ results, timestamp: new Date().toISOString() }, null, 2));
}

function getSearchKeys() {
  if (process.env.SERPER_API_KEY && !process.env.SERPER_API_KEY.includes('secret:')) return { serper: process.env.SERPER_API_KEY };
  try {
    const { getCredential } = require('../../credential_manager');
    const cred = getCredential('serper');
    if (cred && cred.password) return { serper: cred.password };
  } catch(e) {}
  const envFile = path.join(__dirname, '..', '..', '.env');
  if (fs.existsSync(envFile)) {
    const lines = fs.readFileSync(envFile, 'utf8').split('\n');
    const out = {};
    for (const line of lines) {
      if (line.startsWith('SERPER_API_KEY=') && !line.includes('secret:')) out.serper = line.split('=').slice(1).join('=').trim();
      if (line.startsWith('LANGSEARCH_API_KEY=')) out.langsearch = line.split('=').slice(1).join('=').trim();
    }
    if (out.serper) return out;
  }
  return {};
}

async function searchLangSearch(query, count) {
  const keys = getSearchKeys();
  const apiKey = keys.langsearch;
  if (!apiKey) throw new Error('No LangSearch key');
  log(`LangSearch: ${query}`);
  const url = `https://api.langsearch.com/v1/search?q=${encodeURIComponent(query)}&num=${count}`;
  const html = await httpGet(url, { headers: { 'Authorization': `Bearer ${apiKey}` } });
  const json = JSON.parse(html);
  const results = (json.webPages?.value || []).map(r => ({
    title: r.name,
    link: r.url,
    snippet: r.snippet,
    source: 'langsearch'
  }));
  return results;
}

function httpGet(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        ...options.headers
      },
      timeout: 15000,
      ...options
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpGet(res.headers.location, options).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function searchSerper(query, count) {
  const keys = getSearchKeys();
  const apiKey = keys.serper;
  if (!apiKey || apiKey.length < 20) throw new Error('No Serper key');
  log(`Serper search: ${query}`);
  const data = JSON.stringify({ q: query, num: count });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'google.serper.dev',
      path: '/search',
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: 20000
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
            source: 'serper'
          }));
          resolve(results);
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

async function searchDuckDuckGo(query, count) {
  log(`DuckDuckGo fallback: ${query}`);
  const html = await httpGet(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
  const results = [];
  const linkRe = /<a[^\u003e]*class="result__a"[^\u003e]*href="(https?:\/\/[^"]+)"[^\u003e]*>([^\u003c]*)<\/a>/gi;
  let match;
  while ((match = linkRe.exec(html)) !== null && results.length < count) {
    results.push({ title: match[2].trim(), link: match[1], snippet: '', source: 'duckduckgo' });
  }
  return results;
}

async function searchBrave(query, count) {
  log(`Brave fallback: ${query}`);
  const html = await httpGet(`https://search.brave.com/search?q=${encodeURIComponent(query)}`);
  const results = [];
  const linkRe = /<a[^\u003e]*href="(https?:\/\/[^"]+)"[^\u003e]*class="result-header"[^\u003e]*>\s*<span[^\u003e]*>([^\u003c]*)<\/span>/gi;
  let match;
  while ((match = linkRe.exec(html)) !== null && results.length < count) {
    results.push({ title: match[2].trim(), link: match[1], snippet: '', source: 'brave' });
  }
  return results;
}

async function searchYahoo(query, count) {
  log(`Yahoo fallback: ${query}`);
  const html = await httpGet(`https://search.yahoo.com/search?p=${encodeURIComponent(query)}`);
  const results = [];
  const linkRe = /<a[^\u003e]*href="(https?:\/\/[^"]+)"[^\u003e]*class="[^"]*d-ib[^"]*"[^\u003e]*>([^\u003c]*)<\/a>/gi;
  let match;
  while ((match = linkRe.exec(html)) !== null && results.length < count) {
    results.push({ title: match[2].trim(), link: match[1], snippet: '', source: 'yahoo' });
  }
  return results;
}

async function searchWeb(query, count = 5) {
  const cached = loadCache(query);
  if (cached) { log(`Cache hit: ${query}`); return cached; }

  const sources = [
    () => searchSerper(query, count),
    () => searchLangSearch(query, count),
    () => searchDuckDuckGo(query, count),
    () => searchBrave(query, count),
    () => searchYahoo(query, count)
  ];

  for (const source of sources) {
    try {
      const results = await source();
      if (results && results.length > 0) {
        log(`Got ${results.length} results from ${results[0].source || 'unknown'}`);
        saveCache(query, results);
        return results;
      }
    } catch(e) {
      log(`Search source failed: ${e.message}`);
    }
  }

  log('All search sources returned empty');
  return [];
}

async function fetchPageText(url) {
  log(`Fetching: ${url}`);
  const html = await httpGet(url);
  const text = html
    .replace(/<script[^\u003e]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^\u003e]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^\u003e]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, 6000);
}

class ResearchAgent {
  async search(query, count = 5) {
    return await searchWeb(query, count);
  }

  async research(query, count = 5) {
    const results = await this.search(query, count);
    const enriched = [];
    for (const r of results.slice(0, 3)) {
      try {
        const text = await fetchPageText(r.link);
        enriched.push({ ...r, full_text: text, summary: text.slice(0, 500) });
      } catch(e) {
        enriched.push({ ...r, full_text: '', summary: '', error: e.message });
      }
    }
    return enriched;
  }
}

module.exports = { ResearchAgent, searchWeb, fetchPageText };

if (require.main === module) {
  const agent = new ResearchAgent();
  agent.research(process.argv[2] || 'bitcoin price today', 3)
    .then(r => {
      fs.writeFileSync('tmp_research_v2.txt', JSON.stringify(r, null, 2));
      console.log('Wrote tmp_research_v2.txt');
    })
    .catch(e => {
      fs.writeFileSync('tmp_research_v2.txt', JSON.stringify({ error: e.message }, null, 2));
      console.error(e);
    });
}

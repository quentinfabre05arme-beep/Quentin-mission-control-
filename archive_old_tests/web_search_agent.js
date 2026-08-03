/**
 * Web Search Agent — wrapper around OpenClaw's built-in web_search capability.
 * No API keys needed; uses configured provider.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'web_search_agent.log');
const CACHE_DIR = path.join(__dirname, '..', 'memory', 'research_cache');
const CACHE_TTL_MS = 60 * 60 * 1000;

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
  console.log(`[WebSearchAgent] ${msg}`);
}

function getCacheFile(query) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const safe = query.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 80);
  return path.join(CACHE_DIR, `websearch_${safe}.json`);
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

async function search(query, count = 5) {
  const cached = loadCache(query);
  if (cached) return cached;

  log(`Web search: ${query}`);
  try {
    // OpenClaw's web_search is available as a global tool in this environment.
    // When running standalone, fall back to browser researcher.
    if (typeof web_search === 'undefined') {
      throw new Error('web_search tool not available in this context');
    }
    const raw = await web_search({ query, count });
    const results = (raw.results || []).map(r => ({
      title: r.title || '',
      link: r.url || r.link || '',
      snippet: r.snippet || '',
      source: 'openclaw_web_search'
    })).slice(0, count);
    if (results.length > 0) saveCache(query, results);
    return results;
  } catch(e) {
    log(`Web search error: ${e.message}`);
    return [];
  }
}

class WebSearchAgent {
  async search(query, count = 5) {
    return await search(query, count);
  }

  async research(query, count = 5) {
    const results = await this.search(query, count);
    const enriched = [];
    for (const r of results.slice(0, 3)) {
      try {
        const { BrowserResearcher } = require('./browser_researcher');
        const browser = new BrowserResearcher();
        const text = await browser.fetchPageText(r.link);
        enriched.push({ ...r, full_text: text, summary: text.slice(0, 800) });
      } catch(e) {
        enriched.push({ ...r, full_text: '', summary: '', error: e.message });
      }
    }
    return enriched;
  }
}

module.exports = { WebSearchAgent, search };

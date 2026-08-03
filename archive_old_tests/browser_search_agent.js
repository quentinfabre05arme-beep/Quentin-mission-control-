/**
 * Browser-based Search Agent
 * Uses OpenClaw browser automation to extract search results from Brave.
 * More reliable than raw HTTP scraping when engines block bots.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'browser_search_agent.log');
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
  return path.join(CACHE_DIR, `browser_${safe}.json`);
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

function parseBraveResults(snapshotText) {
  const results = [];
  // Match result blocks: link with icon + title + snippet
  const blockRe = /\ud83c\udf10\s+([^\n]+)\s+([^\n]+)\s+\n\s*link\s+"([^"]+)"[^\n]*\n[^\n]*\/url:\s*(https?:\/\/[^\s\n]+)/gi;
  let match;
  while ((match = blockRe.exec(snapshotText)) !== null) {
    results.push({
      title: match[3].trim(),
      link: match[4].trim(),
      snippet: '',
      source: 'brave_browser'
    });
  }
  return results;
}

async function searchWithBrowser(query, count = 5) {
  const cached = loadCache(query);
  if (cached) { log(`Cache hit: ${query}`); return cached; }

  log(`Browser search: ${query}`);

  // This function is designed to be called from within OpenClaw where browser tool is available.
  // When run standalone, it returns empty and logs a note.
  if (typeof require !== 'function') {
    return [];
  }

  // Stub: in real use, the orchestrator/browser_agent_v2 will perform the search and pass snapshot text.
  return [];
}

function parseSnapshot(snapshotText, count = 5) {
  const results = [];
  const lines = snapshotText.split('\n');
  let current = null;
  for (const line of lines) {
    const urlMatch = line.match(/\/url:\s*(https?:\/\/[^\s]+)/);
    const titleMatch = line.match(/generic\s+"([^"]+)"/);
    if (urlMatch && current && current.title) {
      current.link = urlMatch[1];
      results.push(current);
      current = null;
      if (results.length >= count) break;
    } else if (titleMatch) {
      current = { title: titleMatch[1], link: '', snippet: '', source: 'brave_browser' };
    }
  }
  return results;
}

class BrowserSearchAgent {
  async search(query, count = 5) {
    return await searchWithBrowser(query, count);
  }
  async searchFromSnapshot(snapshotText, count = 5) {
    const results = parseSnapshot(snapshotText, count);
    if (results.length > 0) saveCache(queryFromSnapshot(snapshotText), results);
    return results;
  }
}

function queryFromSnapshot(text) {
  const m = text.match(/textbox[^\n]*text:\s*([^\n]+)/);
  return m ? m[1].trim() : 'unknown';
}

module.exports = { BrowserSearchAgent, parseSnapshot };

if (require.main === module) {
  console.log(JSON.stringify({ note: 'BrowserSearchAgent is meant to be invoked by orchestrator with browser snapshot text' }, null, 2));
}

/**
 * Browser Researcher — uses headless Puppeteer to search DuckDuckGo and extract results.
 * Bypasses bot detection that blocks raw HTTP scraping.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'browser_researcher.log');
const CACHE_DIR = path.join(__dirname, '..', 'memory', 'research_cache');
const CACHE_TTL_MS = 60 * 60 * 1000;

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
  console.log(`[BrowserResearcher] ${msg}`);
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
    log(`Cache hit: ${query}`);
    return data.results;
  } catch(e) { return null; }
}

function saveCache(query, results) {
  fs.writeFileSync(getCacheFile(query), JSON.stringify({ results, timestamp: new Date().toISOString() }, null, 2));
}

async function getBrowser() {
  try {
    const puppeteer = require('puppeteer');
    return await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    });
  } catch(e) {
    log(`Puppeteer launch failed: ${e.message}`);
    throw e;
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function searchDuckDuckGo(query, count = 5) {
  const cached = loadCache(query);
  if (cached) return cached;

  log(`Browser search: ${query}`);
  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    });

    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(1500);

    const results = await page.evaluate((count) => {
      const items = [];
      const links = document.querySelectorAll('a.result__a');
      for (const a of links) {
        const href = a.getAttribute('href');
        if (!href) continue;
        const title = a.innerText.trim();
        // Decode DuckDuckGo redirect
        const match = href.match(/uddg=(https%3A%2F%2F[^&]+)/);
        const link = match ? decodeURIComponent(match[1].replace(/%2F/g, '/').replace(/%3A/g, ':')) : href;
        items.push({ title, link, snippet: '', source: 'duckduckgo_browser' });
        if (items.length >= count) break;
      }
      return items;
    }, count);

    if (results.length > 0) saveCache(query, results);
    return results;
  } finally {
    if (browser) await browser.close();
  }
}

async function fetchPageText(url) {
  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(1500);

    const text = await page.evaluate(() => {
      return document.body.innerText.replace(/\s+/g, ' ').trim();
    });
    return text.slice(0, 6000);
  } catch(e) {
    log(`Fetch error ${url}: ${e.message}`);
    return '';
  } finally {
    if (browser) await browser.close();
  }
}

class BrowserResearcher {
  async search(query, count = 5) {
    return await searchDuckDuckGo(query, count);
  }

  async research(query, count = 5) {
    const results = await this.search(query, count);
    const enriched = [];
    for (const r of results.slice(0, 3)) {
      try {
        const text = await fetchPageText(r.link);
        enriched.push({ ...r, full_text: text, summary: text.slice(0, 800) });
      } catch(e) {
        enriched.push({ ...r, full_text: '', summary: '', error: e.message });
      }
    }
    return enriched;
  }
}

module.exports = { BrowserResearcher, searchDuckDuckGo, fetchPageText };

if (require.main === module) {
  const agent = new BrowserResearcher();
  agent.research(process.argv[2] || 'bitcoin price today', 3)
    .then(r => {
      const file = path.join(__dirname, '..', '..', 'tmp_browser_research.json');
      fs.writeFileSync(file, JSON.stringify(r, null, 2));
      console.log(`Wrote ${r.length} results to tmp_browser_research.json`);
    })
    .catch(e => console.error(e));
}

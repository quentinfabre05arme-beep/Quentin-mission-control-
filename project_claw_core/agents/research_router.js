/**
 * Research Router — unified research that picks the best free/low-cost source.
 * Priority: OpenClaw web_search → SearXNG → Serper fallback
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'research_router.log');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
  console.log(`[ResearchRouter] ${msg}`);
}

function runWithTimeout(fn, ms) {
  return Promise.race([
    fn(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Research timeout')), ms))
  ]);
}

async function retry(fn, retries = 2, delayMs = 500) {
  let last;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw last;
}

class ResearchRouter {
  constructor(options = {}) {
    this.webSearchFn = options.webSearchFn || null;
    this.sources = [];
    this.initSources();
  }

  initSources() {
    // 1. OpenClaw web_search tool (when invoked from agent context)
    if (this.webSearchFn) this.sources.push('openclaw_web_search');

    // 1. Tavily Search API (free 1,000/mo, key available)
    try {
      const Tavily = require('./tavily_search');
      this.tavily = Tavily;
      if (Tavily.getApiKey()) this.sources.push('tavily');
    } catch(e) { log(`Tavily init error: ${e.message}`); }

    // 2. OpenClaw web_search tool (when invoked from agent context)
    if (this.webSearchFn) this.sources.push('openclaw_web_search');

    // 3. Brave Search API (if key available)
    try {
      const BraveSearch = require('./brave_search');
      this.brave = BraveSearch;
      if (process.env.BRAVE_API_KEY) this.sources.push('brave');
    } catch(e) { log(`Brave search init error: ${e.message}`); }

    // 4. Local research cache (immediate fallback)
    try {
      this.localCache = require('./local_research_cache');
      this.sources.push('local_research_cache');
    } catch(e) { log(`Local cache init error: ${e.message}`); }

    // 3. SearXNG self-hosted (free forever)
    try {
      const { SearxngClient } = require('./searxng_client');
      this.searxng = new SearxngClient();
      if (this.searxng.isAvailable()) this.sources.push('searxng');
    } catch(e) { log(`SearXNG init error: ${e.message}`); }

    // 4. Legacy research agent (Serper + HTTP fallbacks)
    try {
      const { ResearchAgent } = require('./research_agent');
      this.legacyAgent = new ResearchAgent();
      this.sources.push('legacy');
    } catch(e) { log(`Legacy research agent init error: ${e.message}`); }
  }

  async research(query, count = 5) {
    log(`Research: ${query}`);

    // Try Tavily first
    if (this.tavily) {
      try {
        const result = await runWithTimeout(() => this.tavily.search(query, { count, includeAnswer: true }), 20000);
        if (result.results && result.results.length > 0) {
          log(`Tavily returned ${result.results.length} results`);
          return { source: 'tavily', results: result.results, answer: result.answer };
        }
      } catch(e) { log(`Tavily error: ${e.message}`); }
    }

    // Try OpenClaw web_search if available
    if (this.webSearchFn) {
      try {
        const raw = await this.webSearchFn({ query, count });
        const results = (raw.results || []).map(r => ({
          title: r.title || '',
          link: r.url || r.link || '',
          snippet: r.snippet || '',
          source: 'openclaw_web_search'
        })).slice(0, count);
        if (results.length > 0) {
          log(`OpenClaw web_search returned ${results.length} results`);
          return { source: 'openclaw_web_search', results };
        }
      } catch(e) { log(`OpenClaw web_search error: ${e.message}`); }
    }

    // Try Brave Search API if key available
    if (this.brave) {
      try {
        const result = await runWithTimeout(() => this.brave.search(query, { count }), 15000);
        if (result.results && result.results.length > 0) {
          log(`Brave Search returned ${result.results.length} results`);
          return { source: 'brave', results: result.results };
        }
      } catch(e) { log(`Brave Search error: ${e.message}`); }
    }

    // Try local research cache (offline, immediate)
    if (this.localCache) {
      try {
        const hits = this.localCache.search(query, { topK: count });
        if (hits.length > 0) {
          log(`Local research cache returned ${hits.length} results`);
          return {
            source: 'local_research_cache',
            results: hits.map(h => ({
              title: h.file,
              link: h.file,
              snippet: h.line,
              score: h.score,
              source: h.source
            }))
          };
        }
      } catch(e) { log(`Local cache error: ${e.message}`); }
    }

    // Try SearXNG if available
    if (this.searxng && this.searxng.isAvailable()) {
      try {
        const results = await runWithTimeout(() => this.searxng.search(query, count), 15000);
        if (results.length > 0) {
          log(`SearXNG returned ${results.length} results`);
          return { source: 'searxng', results };
        }
      } catch(e) { log(`SearXNG error: ${e.message}`); }
    }

    // Fallback to legacy research agent
    if (this.legacyAgent) {
      try {
        const results = await runWithTimeout(() => this.legacyAgent.search(query, count), 30000);
        if (results && results.length > 0) {
          log(`Legacy agent returned ${results.length} results`);
          return { source: 'legacy', results };
        }
      } catch(e) { log(`Legacy agent error: ${e.message}`); }
    }

    log('All research sources failed');
    return { source: 'none', results: [] };
  }

  getSources() {
    return [...this.sources];
  }
}

module.exports = { ResearchRouter };

if (require.main === module) {
  const router = new ResearchRouter();
  router.research(process.argv[2] || 'OpenClaw agent framework', 5)
    .then(r => {
      console.log(`Source: ${r.source}`);
      console.log(JSON.stringify(r.results, null, 2));
    })
    .catch(e => console.error(e));
}

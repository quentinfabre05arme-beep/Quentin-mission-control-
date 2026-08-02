/**
 * Research Router — unified research that picks the best free/low-cost source.
 * Priority: OpenSERP local → Serper API → Browser-based fallback
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

class ResearchRouter {
  constructor(options = {}) {
    this.webSearchFn = options.webSearchFn || null; // Optional OpenClaw web_search function
    this.sources = [];
    this.initSources();
  }

  initSources() {
    // 1. OpenSERP local
    try {
      const { OpenSerpClient } = require('./openserp_client');
      this.openserp = new OpenSerpClient();
      this.sources.push('openserp');
    } catch(e) { log(`OpenSERP init error: ${e.message}`); }

    // 2. OpenClaw web_search tool (when invoked from agent context)
    if (this.webSearchFn) this.sources.push('openclaw_web_search');

    // 3. Legacy research agent (Serper + HTTP fallbacks)
    try {
      const { ResearchAgent } = require('./research_agent');
      this.legacyAgent = new ResearchAgent();
      this.sources.push('legacy');
    } catch(e) { log(`Legacy research agent init error: ${e.message}`); }

    // 4. Browser researcher
    try {
      const { BrowserResearcher } = require('./browser_researcher');
      this.browser = new BrowserResearcher();
      this.sources.push('browser');
    } catch(e) { log(`Browser researcher init error: ${e.message}`); }
  }

  async research(query, count = 5) {
    log(`Research: ${query}`);

    // Try OpenSERP first if available
    if (this.openserp && await this.openserp.isAvailable()) {
      const results = await this.openserp.research(query, ['bing', 'duckduckgo'], count);
      if (results.length > 0) {
        log(`OpenSERP returned ${results.length} results`);
        return { source: 'openserp', results };
      }
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

    // Try legacy (Serper + HTTP fallbacks)
    if (this.legacyAgent) {
      try {
        const results = await this.legacyAgent.research(query, count);
        if (results.length > 0) {
          const source = results[0].source || 'legacy';
          log(`Legacy returned ${results.length} results via ${source}`);
          return { source, results };
        }
      } catch(e) { log(`Legacy error: ${e.message}`); }
    }

    // Fallback to browser-based research
    if (this.browser) {
      try {
        const results = await runWithTimeout(() => this.browser.research(query, count), 30000);
        if (results.length > 0) {
          log(`Browser returned ${results.length} results`);
          return { source: 'browser', results };
        }
      } catch(e) { log(`Browser error: ${e.message}`); }
    }

    return { source: 'none', results: [] };
  }
}

module.exports = { ResearchRouter };

if (require.main === module) {
  const router = new ResearchRouter();
  router.research(process.argv[2] || 'bitcoin price today', 3)
    .then(r => {
      fs.writeFileSync('tmp_research_router.json', JSON.stringify(r, null, 2));
      console.log(`Source: ${r.source}, Results: ${r.results.length}`);
    })
    .catch(e => console.error(e));
}

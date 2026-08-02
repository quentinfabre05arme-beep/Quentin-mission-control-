/**
 * Autonomous Business Operation System — Autonomous Researcher
 * Validates opportunities by researching market, competitors, pricing.
 */

const fs = require('fs');
const path = require('path');

const CONFIG = require('../config.json');
const LOG_FILE = path.join(CONFIG.workspace, CONFIG.log_file);
const BACKLOG_FILE = path.join(CONFIG.workspace, CONFIG.backlog_file);

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, entry);
}

function loadBacklog() {
  if (!fs.existsSync(BACKLOG_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(BACKLOG_FILE, 'utf8')); } catch(e) { return []; }
}

function saveBacklog(backlog) {
  fs.mkdirSync(path.dirname(BACKLOG_FILE), { recursive: true });
  fs.writeFileSync(BACKLOG_FILE, JSON.stringify(backlog, null, 2));
}

async function researchOpportunity(id) {
  const backlog = loadBacklog();
  const opp = backlog.find(b => b.id === id);
  if (!opp) return { success: false, error: 'Opportunity not found' };

  log(`Researching opportunity: ${id}`);

  const evidence = {
    researched_at: new Date().toISOString(),
    market_queries: [],
    competitor_queries: [],
    pricing_queries: [],
    findings: []
  };

  const { ResearchRouter } = require(path.join(CONFIG.workspace, 'project_claw_core/agents/research_router'));
  const router = new ResearchRouter();

  try {
    // Market research
    const marketQuery = `${opp.name} market size demand 2026`;
    const marketRes = await router.research(marketQuery, 3);
    evidence.market_queries.push({ query: marketQuery, ...marketRes });

    // Competitor research
    const compQuery = `${opp.name} competitors alternatives`;
    const compRes = await router.research(compQuery, 3);
    evidence.competitor_queries.push({ query: compQuery, ...compRes });

    // Pricing research
    const priceQuery = `${opp.name} pricing subscription`;
    const priceRes = await router.research(priceQuery, 3);
    evidence.pricing_queries.push({ query: priceQuery, ...priceRes });

    evidence.findings.push(`Research router completed. Market: ${marketRes.source} ${marketRes.results.length}, Competitor: ${compRes.source} ${compRes.results.length}, Pricing: ${priceRes.source} ${priceRes.results.length}`);
  } catch(e) {
    log(`Research error for ${id}: ${e.message}`);
    evidence.findings.push(`Research error: ${e.message}`);
  }

  opp.validated = evidence.market_queries.length > 0 && evidence.market_queries[0].results.length > 0;
  opp.evidence.push(evidence);
  opp.status = opp.validated ? 'validated' : 'idea';

  saveBacklog(backlog);
  return { success: true, opportunity: opp, evidence };
}

async function researchTop() {
  const backlog = loadBacklog();
  const unvalidated = backlog.filter(b => !b.validated).sort((a, b) => b.score - a.score);
  const results = [];
  for (const opp of unvalidated.slice(0, 3)) {
    results.push(await researchOpportunity(opp.id));
  }
  return results;
}

module.exports = { researchOpportunity, researchTop };

if (require.main === module) {
  researchTop().then(r => console.log(JSON.stringify(r, null, 2))).catch(e => console.error(e));
}

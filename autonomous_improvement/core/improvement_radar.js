/**
 * Improvement Radar
 * Researches external knowledge about building better autonomous agents.
 */

const { log, runWithTimeout } = require('./utils');
const path = require('path');

const CONFIG = require('../config.json');

async function researchTopic(query) {
  try {
    const { ResearchRouter } = require(path.join(CONFIG.workspace, 'project_claw_core/agents/research_router'));
    const router = new ResearchRouter();
    return await runWithTimeout(() => router.research(query, 3), 60000);
  } catch(e) {
    log(`Research failed for "${query}": ${e.message}`, 'warn');
    return { source: 'error', error: e.message, results: [] };
  }
}

async function scan() {
  log('Scanning for improvement knowledge');
  const findings = [];
  for (const query of CONFIG.research_queries) {
    const result = await researchTopic(query);
    findings.push({ query, ...result });
  }

  const summary = {
    generated_at: new Date().toISOString(),
    findings,
    top_sources: findings.map(f => f.source).filter(Boolean),
    total_results: findings.reduce((sum, f) => sum + (f.results ? f.results.length : 0), 0)
  };

  const fs = require('fs');
  const { saveJson } = require('./utils');
  saveJson(path.join(CONFIG.workspace, CONFIG.data_dir, 'improvement_knowledge.json'), summary);
  log(`Knowledge scan complete: ${summary.total_results} results from ${findings.length} queries`);
  return summary;
}

module.exports = { scan };

if (require.main === module) {
  scan().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}

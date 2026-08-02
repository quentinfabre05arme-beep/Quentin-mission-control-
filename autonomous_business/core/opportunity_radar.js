/**
 * Autonomous Business Operation System — Opportunity Radar
 * Scans signals, market data, web trends, and goals to generate opportunities.
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

function scoreOpportunity(opp) {
  const weights = { feasibility: 0.25, profit_potential: 0.35, alignment: 0.25 };
  // Time to dollar: lower hours = higher score (max 10)
  const timeScore = Math.max(1, 10 - Math.floor(opp.build_time_hours / 5));
  const weighted = (
    opp.feasibility * weights.feasibility +
    opp.profit_potential * weights.profit_potential +
    opp.alignment * weights.alignment +
    timeScore * 0.15
  );
  return Number(weighted.toFixed(2));
}

async function scanInternal() {
  log('Scanning internal opportunities');
  const backlog = loadBacklog();
  const existing = new Set(backlog.map(b => b.id));

  for (const [id, opp] of Object.entries(CONFIG.opportunities)) {
    if (existing.has(id)) continue;
    backlog.push({
      id,
      ...opp,
      score: scoreOpportunity(opp),
      status: 'idea',
      created_at: new Date().toISOString(),
      validated: false,
      evidence: [],
      tasks: []
    });
  }

  backlog.sort((a, b) => b.score - a.score);
  saveBacklog(backlog);
  return backlog;
}

async function scanExternal() {
  log('Scanning external signals');
  const signals = [];

  // Try market watcher
  try {
    const { CapabilityInvoker } = require(path.join(CONFIG.workspace, 'project_claw_core/core/capability_invoker'));
    const invoker = new CapabilityInvoker();
    const btc = await invoker.invoke('market_watcher', 'getTrend', ['BTC']);
    const eth = await invoker.invoke('market_watcher', 'getTrend', ['ETH']);
    if (btc.result && btc.result.trend === 'extreme_fear') {
      signals.push({ type: 'market', ticker: 'BTC', signal: 'contrarian_buy', strength: 8 });
    }
    if (eth.result && eth.result.trend === 'extreme_fear') {
      signals.push({ type: 'market', ticker: 'ETH', signal: 'contrarian_buy', strength: 8 });
    }
  } catch(e) {
    log('External scan error: ' + e.message);
  }

  return signals;
}

async function run() {
  const backlog = await scanInternal();
  const signals = await scanExternal();
  return {
    success: true,
    backlog_count: backlog.length,
    top: backlog.slice(0, 3),
    signals
  };
}

module.exports = { run, scanInternal, scanExternal, scoreOpportunity };

if (require.main === module) {
  run().then(r => console.log(JSON.stringify(r, null, 2))).catch(e => console.error(e));
}

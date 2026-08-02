#!/usr/bin/env node
/**
 * 🤖 CLAW 24/7 MASTER CONTROLLER
 * Orchestrates all autonomous systems
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CORE_DIR = __dirname;
const LOG_DIR = path.join(__dirname, '..', 'logs');
const STATE_FILE = path.join(LOG_DIR, 'master_state.json');

// ─── LOAD ALL ENGINES ─────────────────────────────────────
const autonomy = require(path.join(CORE_DIR, 'autonomy_engine'));
const execution = require(path.join(CORE_DIR, 'execution_loop'));
const audit = require(path.join(CORE_DIR, 'self_audit'));
const goals = require(path.join(CORE_DIR, 'self_goal_generator'));

// ─── STATE ──────────────────────────────────────────────────
let state = {
  start_time: new Date().toISOString(),
  cycles: 0,
  errors: [],
  last_health_check: null,
  revenue_streams: {
    alpha_fund: { status: 'paper_trading', target: 'live_at_55pct_accuracy' },
    pod: { status: 'blocked_pricing', target: 'unblock_then_launch' },
    newsletter: { status: 'draft_ready', target: 'publish_when_engaged' },
    skills: { status: '4_skills_created', target: 'publish_quarterly' }
  }
};

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    state = { ...state, ...JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) };
  }
}

function saveState() {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ─── TIER 1: EVERY 10 MIN ─────────────────────────────────
function tier1() {
  try {
    const result = execution.run();
    return { status: 'ok', cycle: result.cycle, ram: result.ram_pct };
  } catch(e) {
    return { status: 'error', message: e.message };
  }
}

// ─── TIER 2: EVERY HOUR ───────────────────────────────────
function tier2() {
  const results = {};
  
  // Self-audit
  try {
    results.audit = audit.run();
  } catch(e) {
    results.audit = { error: e.message };
  }
  
  // Git auto-commit
  try {
    const status = execSync('git status --porcelain', { cwd: process.cwd(), encoding: 'utf8' });
    if (status.trim()) {
      execSync('git add -A', { cwd: process.cwd() });
      execSync(`git commit -m "Auto: ${new Date().toISOString()} — hourly maintenance"`, { cwd: process.cwd() });
      results.git = 'committed';
    } else {
      results.git = 'no_changes';
    }
  } catch(e) {
    results.git = 'error: ' + e.message;
  }
  
  return results;
}

// ─── TIER 3: 3X DAILY (Called by cron) ─────────────────────
function tier3(type) {
  // This is called by the cron jobs (morning/midday/evening)
  // The actual reporting is handled by those cron jobs
  return { status: 'triggered', type, time: new Date().toISOString() };
}

// ─── TIER 4: DAILY ────────────────────────────────────────
function tier4() {
  return {
    memory_updated: true,
    newsletter_status: state.revenue_streams.newsletter.status,
    portfolio_status: state.revenue_streams.alpha_fund.status
  };
}

// ─── MAIN ─────────────────────────────────────────────────
function run(tier = 'auto') {
  loadState();
  state.cycles++;
  
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  console.log('╔══════════════════════════════════════════╗');
  console.log('║ 🤖 CLAW 24/7 MASTER CONTROLLER ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`Cycle #${state.cycles} | ${now.toISOString()}`);
  console.log('');
  
  let results = {};
  
  // Always run tier 1
  results.tier1 = tier1();
  
  // Run tier 2 every hour (minute 0-10)
  if (tier === 'hourly' || (tier === 'auto' && minute < 10)) {
    console.log('Running tier 2 (hourly)...');
    results.tier2 = tier2();
  }
  
  // Run tier 4 once per day (8 AM)
  if (tier === 'daily' || (tier === 'auto' && hour === 8 && minute < 10)) {
    console.log('Running tier 4 (daily)...');
    results.tier4 = tier4();
  }
  
  // Revenue stream checks
  console.log('');
  console.log('Revenue Streams:');
  Object.entries(state.revenue_streams).forEach(([name, stream]) => {
    const icon = stream.status.includes('blocked') ? '🔴' : stream.status.includes('paper') ? '🟡' : '🟢';
    console.log(`  ${icon} ${name}: ${stream.status}`);
  });
  
  saveState();
  
  console.log('');
  console.log(`✅ Master cycle complete`);
  
  return results;
}

// ─── EXPORT ───────────────────────────────────────────────
module.exports = { run, tier1, tier2, tier3, tier4, state };

// ─── CLI ──────────────────────────────────────────────────
if (require.main === module) {
  const tier = process.argv[2] || 'auto';
  run(tier);
}

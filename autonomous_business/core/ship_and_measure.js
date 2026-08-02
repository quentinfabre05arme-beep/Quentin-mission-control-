/**
 * Autonomous Business Operation System — Ship + Measure
 * Commits artifacts, tracks metrics, learns from outcomes.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG = require('../config.json');
const LOG_FILE = path.join(CONFIG.workspace, CONFIG.log_file);
const BACKLOG_FILE = path.join(CONFIG.workspace, CONFIG.backlog_file);
const METRICS_FILE = path.join(CONFIG.workspace, CONFIG.metrics_file);

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

function loadMetrics() {
  if (!fs.existsSync(METRICS_FILE)) return { cycles: 0, artifacts: 0, ideas: 0, validated: 0, built: 0, last_update: null };
  try { return JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8')); } catch(e) { return { cycles: 0, artifacts: 0, ideas: 0, validated: 0, built: 0, last_update: null }; }
}

function saveMetrics(metrics) {
  fs.mkdirSync(path.dirname(METRICS_FILE), { recursive: true });
  metrics.last_update = new Date().toISOString();
  fs.writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2));
}

function shipGit() {
  log('Shipping via git');
  try {
    execSync('git add autonomous_business 2> nul', { cwd: CONFIG.workspace, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    execSync('git commit -m "Auto: ABOS cycle — backlog, research, build artifacts" 2> nul', { cwd: CONFIG.workspace, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    return { success: true, note: 'committed' };
  } catch(e) {
    return { success: false, note: 'nothing to commit or git error', error: e.message };
  }
}

function measure() {
  const backlog = loadBacklog();
  const metrics = loadMetrics();
  metrics.cycles++;
  metrics.ideas = backlog.filter(b => b.status === 'idea').length;
  metrics.validated = backlog.filter(b => b.status === 'validated').length;
  metrics.built = backlog.filter(b => b.status === 'built').length;
  metrics.artifacts = backlog.reduce((sum, b) => sum + (b.artifacts ? b.artifacts.length : 0), 0);
  saveMetrics(metrics);
  return metrics;
}

async function run() {
  const metrics = measure();
  const git = shipGit();
  return { success: true, metrics, git };
}

module.exports = { run, measure, shipGit };

if (require.main === module) {
  run().then(r => console.log(JSON.stringify(r, null, 2))).catch(e => console.error(e));
}

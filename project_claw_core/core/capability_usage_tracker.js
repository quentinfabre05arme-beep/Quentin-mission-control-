/**
 * CAPABILITY USAGE TRACKER v1.0
 * Logs every capability invocation and aggregates health metrics.
 */

const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(__dirname, '..', 'logs', 'capability_usage.jsonl');
const SUMMARY_PATH = path.join(__dirname, '..', 'data', 'capability_usage_summary.json');

function log(entry) {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + '\n');
}

function loadSummary() {
  try {
    return JSON.parse(fs.readFileSync(SUMMARY_PATH, 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveSummary(summary) {
  fs.mkdirSync(path.dirname(SUMMARY_PATH), { recursive: true });
  fs.writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2));
}

function track(capName, { success, latencyMs, error, argsSize } = {}) {
  const entry = {
    capability: capName,
    success: success !== false,
    latencyMs: latencyMs || 0,
    error: error || null,
    argsSize: argsSize || 0,
    timestamp: new Date().toISOString()
  };
  log(entry);

  const summary = loadSummary();
  const s = summary[capName] || { calls: 0, successes: 0, failures: 0, totalLatencyMs: 0, lastError: null };
  s.calls += 1;
  if (entry.success) s.successes += 1;
  else {
    s.failures += 1;
    s.lastError = entry.error;
  }
  s.totalLatencyMs += entry.latencyMs;
  s.avgLatencyMs = s.totalLatencyMs / s.calls;
  s.winRate = s.successes / s.calls;
  s.maxLatencyMs = Math.max(s.maxLatencyMs || 0, entry.latencyMs);
  summary[capName] = s;
  saveSummary(summary);
  return entry;
}

function getHealth() {
  const summary = loadSummary();
  const unhealthy = Object.entries(summary)
    .filter(([_, s]) => s.calls >= 3 && s.winRate < 0.5)
    .map(([name, _]) => name);
  return { summary, unhealthy, totalCapabilities: Object.keys(summary).length };
}

module.exports = { track, getHealth, loadSummary };

if (require.main === module) {
  console.log(JSON.stringify(getHealth(), null, 2));
}

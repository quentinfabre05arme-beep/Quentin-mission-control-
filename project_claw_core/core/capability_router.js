/**
 * CAPABILITY ROUTER v1.0
 * Routes a high-level task to the most appropriate registered capability.
 * Uses keyword / embedding matching and maintains a performance index.
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, '..', 'data', 'capability_registry.json');
const INDEX_PATH = path.join(__dirname, '..', 'data', 'capability_router_index.json');

function loadRegistry() {
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  } catch (e) {
    return { capabilities: [] };
  }
}

function loadIndex() {
  try {
    return JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveIndex(index) {
  fs.mkdirSync(path.dirname(INDEX_PATH), { recursive: true });
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
}

// Simple keyword scoring. Future: use embeddings.
function scoreCapability(cap, taskLower) {
  const name = cap.name || '';
  const words = name.toLowerCase().split(/[_-]/);
  let score = 0;
  for (const w of words) {
    if (taskLower.includes(w)) score += 2;
  }
  if (taskLower.includes(name.toLowerCase())) score += 5;

  // Performance index bonus
  const index = loadIndex();
  const perf = index[cap.name];
  if (perf) {
    const winRate = perf.success / (perf.calls || 1);
    score += winRate * 3;
    score -= (perf.avgLatencyMs || 0) / 5000;
  }
  return score;
}

function route(task) {
  const registry = loadRegistry();
  const taskLower = (task || '').toLowerCase();
  let best = null;
  let bestScore = -Infinity;

  for (const cap of registry.capabilities || []) {
    const s = scoreCapability(cap, taskLower);
    if (s > bestScore) {
      bestScore = s;
      best = cap;
    }
  }

  return {
    task,
    capability: best ? best.name : null,
    path: best ? best.path : null,
    score: bestScore,
    note: best ? null : 'no capability matched'
  };
}

function recordOutcome(capName, success, latencyMs) {
  const index = loadIndex();
  const entry = index[capName] || { calls: 0, success: 0, failures: 0, totalLatencyMs: 0 };
  entry.calls += 1;
  if (success) entry.success += 1;
  else entry.failures += 1;
  entry.totalLatencyMs = (entry.totalLatencyMs || 0) + (latencyMs || 0);
  entry.avgLatencyMs = entry.totalLatencyMs / entry.calls;
  index[capName] = entry;
  saveIndex(index);
}

module.exports = { route, recordOutcome, loadIndex };

if (require.main === module) {
  const task = process.argv[2] || 'check system health and send status report';
  const result = route(task);
  console.log(JSON.stringify(result, null, 2));
}

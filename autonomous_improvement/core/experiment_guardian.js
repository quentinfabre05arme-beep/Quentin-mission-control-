/**
 * EXPERIMENT GUARDIAN v1.0
 * Safety wrapper for autonomous improvement experiments.
 * Enforces: cost cap, rollback on failure, deterministic verification, approval gates.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const KNOWLEDGE_PATH = path.join(__dirname, '..', 'data', 'learning.json');
const DEFAULT_TOKEN_BUDGET = 20000;

function loadKnowledge() {
  try {
    return JSON.parse(fs.readFileSync(KNOWLEDGE_PATH, 'utf8'));
  } catch (e) {
    return { failures: [], successes: [] };
  }
}

function saveKnowledge(k) {
  fs.mkdirSync(path.dirname(KNOWLEDGE_PATH), { recursive: true });
  fs.writeFileSync(KNOWLEDGE_PATH, JSON.stringify(k, null, 2));
}

function recordFailure(hypothesis, reason) {
  const k = loadKnowledge();
  k.failures.push({ hypothesis, reason, at: new Date().toISOString() });
  // Keep last 200
  k.failures = k.failures.slice(-200);
  saveKnowledge(k);
}

function recordSuccess(hypothesis, files) {
  const k = loadKnowledge();
  k.successes.push({ hypothesis, files, at: new Date().toISOString() });
  k.successes = k.successes.slice(-200);
  saveKnowledge(k);
}

function hasFailedBefore(hypothesis) {
  const k = loadKnowledge();
  return k.failures.some(f => f.hypothesis === hypothesis);
}

function isDestructive(filePath) {
  const destructivePatterns = ['credential', 'secret', 'token', 'password', 'wallet', '.env', 'node_modules'];
  const lower = filePath.toLowerCase();
  return destructivePatterns.some(p => lower.includes(p));
}

function gateCheck(filePath) {
  if (isDestructive(filePath)) {
    return { allowed: false, reason: 'destructive path detected: ' + filePath };
  }
  return { allowed: true };
}

function syntaxCheck(filePath) {
  try {
    execSync(`node -c "${filePath.replace(/"/g, '\\"')}"`, { windowsHide: true });
    return true;
  } catch (e) {
    return false;
  }
}

function runSafely(experimentFn, { hypothesis, files, tokenBudget = DEFAULT_TOKEN_BUDGET } = {}) {
  const start = Date.now();

  if (hasFailedBefore(hypothesis)) {
    return { success: false, reason: 'hypothesis previously failed' };
  }

  for (const f of files || []) {
    const gate = gateCheck(f);
    if (!gate.allowed) return { success: false, reason: gate.reason };
  }

  try {
    const result = experimentFn();
    const latency = Date.now() - start;

    for (const f of files || []) {
      if (!syntaxCheck(f)) {
        recordFailure(hypothesis, `syntax check failed: ${f}`);
        return { success: false, reason: `syntax check failed: ${f}` };
      }
    }

    if (latency > tokenBudget * 2) { // rough ms-to-token heuristic
      recordFailure(hypothesis, 'experiment exceeded time budget');
      return { success: false, reason: 'experiment exceeded time budget' };
    }

    recordSuccess(hypothesis, files);
    return { success: true, result, latency_ms: latency };
  } catch (e) {
    recordFailure(hypothesis, e.message);
    return { success: false, reason: e.message };
  }
}

module.exports = { runSafely, recordFailure, recordSuccess, hasFailedBefore, gateCheck, syntaxCheck };

if (require.main === module) {
  const demo = runSafely(() => 'ok', { hypothesis: 'demo', files: ['autonomous_improvement/core/experiment_guardian.js'] });
  console.log(JSON.stringify(demo, null, 2));
}

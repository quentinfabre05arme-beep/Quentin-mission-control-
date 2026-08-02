/**
 * Self Review
 * Quick post-change checks: syntax/load of changed file and dependent modules.
 * Full verifier is run for metrics only, not as a commit gate.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { log } = require('./utils');

const CONFIG = require('../config.json');

function findDependents(filePath) {
  const base = path.basename(filePath, '.js');
  const workspace = CONFIG.workspace;
  const dependents = [];
  try {
    const out = execSync(`git grep -l "require.*['\"]\.\/${base}['\"]" -- '*.js' || true`, { cwd: workspace, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    for (const line of out.split(/\r?\n/)) {
      if (line.trim()) dependents.push(line.trim());
    }
  } catch(e) {}
  return dependents;
}

function checkDependents(filePath) {
  const dependents = findDependents(filePath);
  const results = [];
  for (const dep of dependents) {
    const depPath = path.join(CONFIG.workspace, dep);
    if (!fs.existsSync(depPath)) continue;
    let ok = true;
    let error = null;
    try {
      execSync(`node -c ${depPath}`, { encoding: 'utf8', stdio: 'pipe' });
    } catch(e) {
      ok = false;
      error = e.message;
    }
    results.push({ file: dep, ok, error });
  }
  return { dependents, results, allOk: results.every(r => r.ok) };
}

function runVerifierMetrics(pattern = '*.js') {
  try {
    const out = execSync(`node safe_capability_verifier.js --pattern "${pattern}" --json`, { cwd: CONFIG.workspace, encoding: 'utf8', stdio: 'pipe', timeout: 120000 });
    const jsonStart = out.indexOf('{');
    const jsonEnd = out.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      const parsed = JSON.parse(out.slice(jsonStart, jsonEnd + 1));
      return {
        total: parsed.total || 0,
        passed: parsed.passed || 0,
        failed: parsed.failed || 0
      };
    }
  } catch(e) {}
  // Fallback: parse human-readable summary
  try {
    const out = execSync(`node safe_capability_verifier.js --pattern "${pattern}"`, { cwd: CONFIG.workspace, encoding: 'utf8', stdio: 'pipe', timeout: 120000 });
    const verifiedMatch = out.match(/Verified:\s*(\d+)\/(\d+)/);
    const failedMatch = out.match(/Failed:\s*(\d+)/);
    if (verifiedMatch) {
      const passed = parseInt(verifiedMatch[1], 10);
      const total = parseInt(verifiedMatch[2], 10);
      const failed = failedMatch ? parseInt(failedMatch[1], 10) : total - passed;
      return { total, passed, failed };
    }
  } catch(e) {}
  return { total: 0, passed: 0, failed: 0, note: 'verifier unavailable' };
}

function review(change) {
  log(`Running self-review for ${change.filePath}`);
  const depCheck = checkDependents(change.filePath);
  const metrics = runVerifierMetrics(path.basename(change.filePath));
  const ok = depCheck.allOk;
  return { ok, depCheck, metrics };
}

module.exports = { review, checkDependents, runVerifierMetrics };

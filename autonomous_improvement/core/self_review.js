/**
 * Self Review
 * After a change, verify it doesn't break dependent modules or the verifier.
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
  // Fast grep for require() references
  try {
    const out = execSync(`git grep -l "require.*['\"]\.\/${base}['\"]" -- '*.js' || true`, { cwd: workspace, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    for (const line of out.split(/\r?\n/)) {
      if (line.trim()) dependents.push(line.trim());
    }
  } catch(e) {
    // git grep may fail in non-git or no matches
  }
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

function runVerifierSample(pattern = '*.js') {
  try {
    const out = execSync(`node safe_capability_verifier.js --pattern "${pattern}" --json`, { cwd: CONFIG.workspace, encoding: 'utf8', stdio: 'pipe', timeout: 120000 });
    const parsed = JSON.parse(out);
    return {
      total: parsed.total || 0,
      passed: parsed.passed || 0,
      failed: parsed.failed || 0,
      allOk: (parsed.failed || 0) === 0
    };
  } catch(e) {
    return { total: 0, passed: 0, failed: 0, allOk: false, error: e.message };
  }
}

function review(change) {
  log(`Running self-review for ${change.filePath}`);
  const depCheck = checkDependents(change.filePath);
  const verifier = runVerifierSample(path.basename(change.filePath));
  const ok = depCheck.allOk && verifier.allOk;
  return { ok, depCheck, verifier };
}

module.exports = { review, checkDependents, runVerifierSample };

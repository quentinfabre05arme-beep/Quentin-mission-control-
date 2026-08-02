/**
 * Capability Profiler
 * Identifies weak, slow, or under-used capabilities.
 */

const fs = require('fs');
const path = require('path');
const { log, loadJson, saveJson } = require('./utils');

const CONFIG = require('../config.json');

const INVOKER_LOG = path.join(CONFIG.workspace, 'project_claw_core', 'logs', 'capability_invoker.log');
const LEARNING_FILE = path.join(CONFIG.workspace, 'project_claw_core', 'data', 'learning_model.json');
const REGISTRY_FILE = path.join(CONFIG.workspace, 'project_claw_core', 'data', 'capability_registry.json');

function loadInvocations() {
  if (!fs.existsSync(INVOKER_LOG)) return [];
  const lines = fs.readFileSync(INVOKER_LOG, 'utf8').split('\n').filter(Boolean);
  return lines.map(line => {
    const match = line.match(/Invoking ([^.]+)\.([^\(]+)\((\d+) args\)/);
    if (!match) return null;
    return { capability: match[1], method: match[2], args: parseInt(match[3], 10), timestamp: line.slice(1, 20) };
  }).filter(Boolean);
}

function analyze() {
  log('Profiling capabilities');
  const invocations = loadInvocations();
  const learning = loadJson(LEARNING_FILE) || {};
  const registry = loadJson(REGISTRY_FILE) || {};
  const entries = registry.entries || [];

  const counts = {};
  invocations.forEach(i => { counts[i.capability] = (counts[i.capability] || 0) + 1; });

  const scored = entries.map(e => {
    const cap = e.name;
    const learn = learning[cap] || { attempts: 0, successes: 0, failures: 0 };
    const successRate = learn.attempts ? learn.successes / learn.attempts : null;
    const invocationCount = counts[cap] || 0;

    let issueScore = 0;
    if (successRate !== null && successRate < 0.7) issueScore += 20;
    if (invocationCount === 0) issueScore += 10;
    if (invocationCount < 3) issueScore += 5;
    if (learn.failures > learn.successes) issueScore += 15;

    return {
      name: cap,
      path: e.path,
      category: e.category,
      invocations: invocationCount,
      success_rate: successRate,
      attempts: learn.attempts,
      failures: learn.failures,
      issue_score: issueScore
    };
  });

  scored.sort((a, b) => b.issue_score - a.issue_score);
  const weak = scored.filter(s => s.issue_score > 0);

  const profile = {
    generated_at: new Date().toISOString(),
    total_capabilities: entries.length,
    weak_capabilities: weak.length,
    top_weak: weak.slice(0, 5),
    least_used: scored.filter(s => s.invocations === 0).slice(0, 5).map(s => s.name),
    lowest_success: scored.filter(s => s.success_rate !== null).sort((a, b) => a.success_rate - b.success_rate).slice(0, 5)
  };

  saveJson(path.join(CONFIG.workspace, CONFIG.data_dir, 'capability_profile.json'), profile);
  log(`Profiled ${entries.length} capabilities, ${weak.length} flagged`);
  return profile;
}

module.exports = { analyze };

if (require.main === module) {
  analyze();
}

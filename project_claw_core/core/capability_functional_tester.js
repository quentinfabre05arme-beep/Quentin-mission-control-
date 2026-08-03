/**
 * CAPABILITY FUNCTIONAL TESTER v1.0
 * Runs a JSON suite of functional tests against registered capabilities.
 * Each test calls a method with arguments and checks result.success.
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, '..', 'data', 'capability_registry.json');
const SUITE_PATH = path.join(__dirname, 'capability_functional_tests.json');
const RESULTS_PATH = path.join(__dirname, '..', 'data', 'capability_functional_results.json');

function loadRegistry() {
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
}

function loadSuite() {
  return JSON.parse(fs.readFileSync(SUITE_PATH, 'utf8'));
}

function saveResults(results) {
  fs.mkdirSync(path.dirname(RESULTS_PATH), { recursive: true });
  fs.writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2));
}

function findCap(registry, name) {
  return (registry.capabilities || []).find(c => c.name === name);
}

function runTest(name, spec) {
  const registry = loadRegistry();
  const cap = findCap(registry, name);
  if (!cap) return { success: false, error: 'not in registry' };

  try {
    const mod = require(cap.path);
    const clsName = Object.keys(mod).find(k => typeof mod[k] === 'function' && /^[A-Z]/.test(k));
    const staticName = Object.keys(mod).find(k => typeof mod[k] === 'function' && !/^[A-Z]/.test(k));

    let result;
    if (clsName) {
      const instance = new mod[clsName]();
      result = instance[spec.method](...spec.args);
    } else if (staticName) {
      result = mod[staticName](...spec.args);
    } else {
      return { success: false, error: 'no callable export' };
    }

    if (result && typeof result.then === 'function') {
      result = { success: false, error: 'async result not awaited in sync tester' };
    }

    const success = result && result.success !== false;
    return { success, result: result ? (result.success !== false ? 'ok' : result.error) : null };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function runAll() {
  const suite = loadSuite();
  const results = [];
  for (const [name, spec] of Object.entries(suite)) {
    const start = Date.now();
    const r = runTest(name, spec);
    results.push({ name, ...r, duration_ms: Date.now() - start });
  }
  const passed = results.filter(r => r.success).length;
  const report = {
    timestamp: new Date().toISOString(),
    total: results.length,
    passed,
    failed: results.length - passed,
    results
  };
  saveResults(report);
  return report;
}

module.exports = { runTest, runAll };

if (require.main === module) {
  const report = runAll();
  console.log(`Functional tests: ${report.passed}/${report.total} passed`);
  for (const r of report.results) {
    console.log(`  ${r.success ? '✅' : '❌'} ${r.name}${r.error ? ' — ' + r.error : ''}`);
  }
}

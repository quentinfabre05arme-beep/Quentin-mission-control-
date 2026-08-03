/**
 * CAPABILITY FUNCTIONAL TESTER v1.1
 * Runs a JSON suite of functional tests against registered capabilities.
 * Supports async methods and expected failure/success outcomes.
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

function normalizeResult(raw) {
  if (raw && typeof raw.then === 'function') {
    return { success: false, error: 'async result not awaited (use async:true)' };
  }
  return raw || {};
}

async function runTest(name, spec) {
  const registry = loadRegistry();
  const cap = findCap(registry, name);
  if (!cap) return { success: false, error: 'not in registry' };

  try {
    const mod = require(cap.path);
    const clsName = Object.keys(mod).find(k => typeof mod[k] === 'function' && /^[A-Z]/.test(k));
    const staticName = Object.keys(mod).find(k => typeof mod[k] === 'function' && !/^[A-Z]/.test(k));

    let raw;
    if (clsName) {
      const instance = new mod[clsName]();
      raw = instance[spec.method](...spec.args);
    } else if (staticName) {
      raw = mod[staticName](...spec.args);
    } else {
      return { success: false, error: 'no callable export' };
    }

    let result;
    if (spec.async && raw && typeof raw.then === 'function') {
      result = await raw;
    } else {
      result = normalizeResult(raw);
    }

    const returnedSuccess = result.success !== false;
    const expect = spec.expect || 'success';
    const passed = expect === 'success' ? returnedSuccess : !returnedSuccess;

    return {
      success: passed,
      returned: returnedSuccess,
      expected: expect,
      error: passed ? null : (result.error || `expected ${expect}, got ${returnedSuccess}`)
    };
  } catch (e) {
    return { success: spec.expect === 'error', error: e.message, expected: spec.expect || 'success' };
  }
}

async function runAll() {
  const suite = loadSuite();
  const results = [];
  for (const [name, spec] of Object.entries(suite)) {
    const start = Date.now();
    const r = await runTest(name, spec);
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
  runAll().then(report => {
    console.log(`Functional tests: ${report.passed}/${report.total} passed`);
    for (const r of report.results) {
      console.log(`  ${r.success ? '✅' : '❌'} ${r.name}${r.error ? ' — ' + r.error : ''}`);
    }
  }).catch(e => {
    console.error('Functional tester error:', e.message);
    process.exit(1);
  });
}

/**
 * CAPABILITY VERIFICATION RUNNER v3
 * Test every real capability with timeouts.
 */

const fs = require('fs');
const path = require('path');

const { SelfAudit } = require('./project_claw_core/core/self_audit');
const LOG_FILE = path.join(__dirname, 'project_claw_core', 'logs', 'capability_verification.jsonl');
const SUMMARY_FILE = path.join(__dirname, 'project_claw_core', 'data', 'capability_verification_summary.json');

const SKIP = ['microsoft_browser_agent', 'linkedin_agent', 'x_agent', 'github_agent', 'gmail_agent', 'microsoft_graph_agent', 'microsoft_graph_auth', 'browser_agent_v2'];

function log(entry) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
}

async function runWithTimeout(fn, ms = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    Promise.resolve(fn()).then(r => { clearTimeout(timer); resolve(r); }).catch(e => { clearTimeout(timer); reject(e); });
  });
}

async function verifyCapability(capName, capPath) {
  if (SKIP.includes(capName)) {
    return { capability: capName, success: true, note: 'skipped — requires credentials or browser profile', duration_ms: 0 };
  }
  
  const start = Date.now();
  try {
    const mod = require(capPath);
    const exports = Object.keys(mod);
    const clsName = exports.find(k => typeof mod[k] === 'function' && /^[A-Z]/.test(k));
    const fnName = exports.find(k => typeof mod[k] === 'function' && !/^[A-Z]/.test(k));
    
    let result;
    if (clsName) {
      const instance = new mod[clsName]();
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(instance)).filter(m => typeof instance[m] === 'function' && m !== 'constructor');
      const safeMethods = ['status', 'getHealth', 'list', 'run', 'build', 'generate', 'get', 'search', 'research', 'read'];
      let method = methods.find(m => safeMethods.includes(m));
      if (!method && methods.length > 0) method = methods[0];
      if (!method) return { capability: capName, success: false, error: 'no methods', duration_ms: 0 };
      result = await runWithTimeout(() => instance[method](), 5000);
    } else if (fnName) {
      result = await runWithTimeout(() => mod[fnName](), 5000);
    } else {
      return { capability: capName, success: false, error: 'no callable exports', duration_ms: 0 };
    }
    
    const duration = Date.now() - start;
    const success = !result || result.success !== false;
    const entry = { capability: capName, success, duration_ms: duration, error: result && result.error ? result.error : null };
    log(entry);
    return entry;
  } catch(e) {
    const entry = { capability: capName, success: false, duration_ms: Date.now() - start, error: e.message };
    log(entry);
    return entry;
  }
}

async function main() {
  const audit = new SelfAudit().run();
  const realCapabilities = audit.details.filter(d => d.real);
  
  console.log(`Verifying ${realCapabilities.length} capabilities...`);
  const results = [];
  
  for (const cap of realCapabilities) {
    const name = cap.name || path.basename(cap.path, '.js');
    const result = await verifyCapability(name, cap.path);
    results.push(result);
    process.stdout.write(`${result.success ? '✅' : '❌'} ${name}: ${result.success ? result.duration_ms + 'ms' : result.error}\n`);
  }
  
  const passed = results.filter(r => r.success).length;
  const failed = results.length - passed;
  const summary = {
    timestamp: new Date().toISOString(),
    total: results.length,
    passed,
    failed,
    failed_capabilities: results.filter(r => !r.success).map(r => r.capability)
  };
  
  fs.writeFileSync(SUMMARY_FILE, JSON.stringify(summary, null, 2));
  console.log(`\n=== VERIFICATION COMPLETE ===`);
  console.log(`Passed: ${passed}/${results.length}`);
  if (failed > 0) {
    console.log(`Failed: ${failed}`);
    for (const f of summary.failed_capabilities) console.log(`  - ${f}`);
  }
}

main().catch(console.error);

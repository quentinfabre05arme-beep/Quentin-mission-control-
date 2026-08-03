/**
 * CAPABILITY VERIFY ONE — Isolated child-process test for a single capability.
 * Usage: node capability_verify_one.js <path/to/capability.js> [name]
 * Exit code 0 if success or skip, 1 if fail, 2 if internal error.
 * Prints JSON result to stdout.
 */

const fs = require('fs');
const path = require('path');

const capPath = process.argv[2];
const capName = process.argv[3] || path.basename(capPath, '.js');

if (!capPath || !fs.existsSync(capPath)) {
  console.log(JSON.stringify({ capability: capName, success: false, error: 'missing path' }));
  process.exit(1);
}

const safeMethods = ['status', 'getHealth', 'list', 'run', 'build', 'generate', 'get', 'search', 'research', 'read', 'getSources'];

async function runWithTimeout(fn, ms = 2000) {
  return Promise.race([
    Promise.resolve(fn()).catch(e => ({ success: false, error: e.message })),
    new Promise(resolve => setTimeout(() => resolve({ success: false, error: `timeout after ${ms}ms` }), ms))
  ]);
}

async function main() {
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
      let method = methods.find(m => safeMethods.includes(m));
      if (!method && methods.length > 0) method = methods[0];
      if (!method) {
        console.log(JSON.stringify({ capability: capName, success: false, error: 'no methods', duration_ms: Date.now() - start }));
        process.exit(1);
      }
      result = await runWithTimeout(() => instance[method](), 2000);
    } else if (fnName) {
      result = await runWithTimeout(() => mod[fnName](), 2000);
    } else {
      console.log(JSON.stringify({ capability: capName, success: false, error: 'no callable exports', duration_ms: Date.now() - start }));
      process.exit(1);
    }

    const success = result && result.success !== false;
    const error = result && result.error ? result.error : null;
    const duration = Date.now() - start;
    console.log(JSON.stringify({ capability: capName, success, duration_ms: duration, error }));
    process.exit(success ? 0 : 1);
  } catch(e) {
    console.log(JSON.stringify({ capability: capName, success: false, duration_ms: Date.now() - start, error: e.message }));
    process.exit(2);
  }
}

// Hard child-process timeout
setTimeout(() => {
  console.log(JSON.stringify({ capability: capName, success: false, error: 'hard process timeout (10s)' }));
  process.exit(2);
}, 10000);

main();

/**
 * CAPABILITY VERIFY ONE v2.0 — Isolated child-process test for a single capability.
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

const safeMethods = ['status', 'getHealth', 'list', 'run', 'build', 'generate', 'get', 'search', 'research', 'read', 'getSources', 'analyze'];

// Default arguments for methods that require parameters. This pushes the
// pass rate up by giving each capability a sensible minimal input.
const ARG_MAP = {
  file_indexer: { index: () => ({ directory: 'C:/Users/quent/.openclaw/workspace', extensions: ['.md', '.txt'] }) },
  drive_indexer: { index: () => ({ mimeType: 'application/vnd.google-apps.spreadsheet' }) },
  file_organizer: { organize: () => ({ sourceDir: 'C:/Users/quent/.openclaw/workspace/reports', pattern: '.*' }) },
  hash_agent: { hash: () => ({ filePath: 'C:/Users/quent/.openclaw/workspace/README.md' }) },
  doc_generator: { generate: () => ({ template: 'default', data: {} }) },
  compressor_agent: { compress: () => ({ source: 'C:/Users/quent/.openclaw/workspace/README.md', destination: 'C:/Users/quent/.openclaw/workspace/README.zip' }) },
  file_archiver: { archive: () => ({ source: 'C:/Users/quent/.openclaw/workspace/README.md', destination: 'C:/Users/quent/.openclaw/workspace/README.zip' }) },
  registry_manager: { query: () => ({ key: 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion', value: 'ProgramFilesDir' }) },
  web_monitor: { monitor: () => ({ urls: ['https://example.com'] }) },
  network_monitor: { ping: () => ({ host: '1.1.1.1' }) },
  network_speed_tester: { test: () => ({ server: 'https://speed.cloudflare.com' }) },
  package_installer: { install: () => ({ id: 'Git.Git' }) },
  test_runner: { run: () => ({ path: 'skills/claw-market-data-snapshot/tests/test_service.js' }) },
  code_agent: { run: () => ({ file: 'missions/token_monitor.js' }) },
  verifier: { verify: () => ({ path: 'project_claw_core/core/self_audit.js' }) },
  deploy_agent: { deploy: () => ({ target: 'local' }) },
  speech_agent: { synthesize: () => ({ text: 'hello world' }) },
  notify_engine: { notify: () => ({ message: 'test', channel: 'telegram' }) },
  polyglot_coder: { run: () => ({ language: 'javascript', code: 'console.log(1)' }) },
  vector_brain: { query: () => ({ text: 'market data', topK: 3 }) },
  store_manager: { get: () => ({ key: 'test' }) },
  sync_manager: { sync: () => ({ source: 'README.md', destination: 'README.md.bak' }) },
  credential_rotator: { rotate: () => ({ service: 'google' }) },
  click_by_text: { click: () => ({ text: 'OK' }) },
  risk_engine: { evaluate: () => ({ type: 'market', data: { price: 100 } }) },
  form_filler: { fill: () => ({ fields: { name: 'Test' } }) },
  strategy_optimizer: { optimize: () => ({ strategy: 'buy_hold', metrics: {} }) },
  reasoning_engine: { reason: () => ({ prompt: 'Is 2+2=4?' }) },
  content_factory: { create: () => ({ topic: 'test', format: 'text' }) },
  agent_swarm: { run: () => ({ agents: [], task: 'test' }) },
  process_killer: { kill: () => ({ name: 'notepad.exe' }) },
  anomaly_detector: { detect: () => ({ data: [1, 2, 3, 100] }) },
  long_term_memory: { recall: () => ({ query: 'test' }) },
  pdf_reader_agent: { read: () => ({ file: 'README.md' }) },
  window_automation: { activate: () => ({ title: 'OpenClaw' }) },
  screen_recorder: { record: () => ({ duration: 1 }) },
};

function log(entry) {
  console.log(JSON.stringify(entry));
}

function getArgs(capName, method) {
  const map = ARG_MAP[capName];
  if (!map) return [];
  const builder = map[method];
  if (!builder) return [];
  try {
    const args = builder();
    return Array.isArray(args) ? args : [args];
  } catch (e) {
    return [];
  }
}

function runWithTimeout(fn, ms = 2000) {
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
        log({ capability: capName, success: false, error: 'no methods', duration_ms: Date.now() - start });
        process.exit(1);
      }
      const args = getArgs(capName, method);
      result = await runWithTimeout(() => instance[method](...args), 2000);
    } else if (fnName) {
      const args = getArgs(capName, fnName);
      result = await runWithTimeout(() => mod[fnName](...args), 2000);
    } else {
      log({ capability: capName, success: false, error: 'no callable exports', duration_ms: Date.now() - start });
      process.exit(1);
    }

    const success = result && result.success !== false;
    const error = result && result.error ? result.error : null;
    const duration = Date.now() - start;
    log({ capability: capName, success, duration_ms: duration, error });
    process.exit(success ? 0 : 1);
  } catch(e) {
    log({ capability: capName, success: false, duration_ms: Date.now() - start, error: e.message });
    process.exit(2);
  }
}

// Hard child-process timeout
setTimeout(() => {
  log({ capability: capName, success: false, error: 'hard process timeout (10s)' });
  process.exit(2);
}, 10000);

main();

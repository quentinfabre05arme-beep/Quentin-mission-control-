/**
 * CAPABILITY VERIFY ONE v4.3 — Isolated child-process test for a single capability.
 * Usage: node capability_verify_one.js <path/to/capability.js> [name]
 * Exit code 0 if success, 1 if fail, 2 if internal error.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const capPath = process.argv[2];
const capName = process.argv[3] || path.basename(capPath, '.js');

if (!capPath || !fs.existsSync(capPath)) {
  console.log(JSON.stringify({ capability: capName, success: false, error: 'missing path' }));
  process.exit(1);
}

function log(entry) {
  console.log(JSON.stringify(entry));
}

function parseParams(fn) {
  const src = fn.toString().replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const m = src.match(/\(([^)]*)\)/);
  if (!m) return [];
  return m[1].split(',').map(p => p.trim().replace(/=.*$/, '').split(/[\s=]/)[0]).filter(Boolean);
}

function ensureTempFile(ext = '.txt') {
  const tmp = path.join(os.tmpdir(), `claw_verify_${Date.now()}${ext}`);
  fs.writeFileSync(tmp, 'claw test');
  return tmp;
}

function ensureTempDir() {
  const tmp = path.join(os.tmpdir(), `claw_verify_dir_${Date.now()}`);
  fs.mkdirSync(tmp, { recursive: true });
  fs.writeFileSync(path.join(tmp, 'test.txt'), 'claw test');
  return tmp;
}

function ensureJsFile() {
  const tmp = path.join(os.tmpdir(), `claw_verify_${Date.now()}.js`);
  fs.writeFileSync(tmp, 'console.log("claw test"); module.exports = { test: true };');
  return tmp;
}

function ensurePdfFile() {
  const tmp = path.join(os.tmpdir(), `claw_verify_${Date.now()}.pdf`);
  fs.writeFileSync(tmp, '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]>>endobj\ntrailer<</Size 4/Root 1 0 R>>%%EOF');
  return tmp;
}

const safeMethods = ['status', 'getHealth', 'list', 'run', 'build', 'generate', 'get', 'search', 'research', 'read', 'getSources', 'analyze'];

const METHOD_SELECT = {
  registry_manager: { method: 'read', args: ['HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion', 'ProgramFilesDir'] },
  web_monitor: { method: 'check', args: [['https://example.com']] },
  verifier: { method: 'verifyFile', args: ['core/self_audit.js'], isStatic: true },
  package_installer: { method: 'isInstalled', args: ['git'] },
  file_organizer: { method: 'organize', args: [ensureTempDir()] },
  pdf_reader_agent: { method: 'read', args: [ensurePdfFile()] },
  network_monitor: { method: 'ping', args: ['1.1.1.1', 1] },
  vector_brain: { method: 'search', args: ['test'] },
  hash_agent: { method: 'hashString', args: ['test', 'sha256'] },
  store_manager: { method: 'set', args: ['test', { value: 1 }] },
  sync_manager: { method: 'syncDirectory', args: [ensureTempDir(), path.join(os.tmpdir(), `claw_sync_${Date.now()}`), { dryRun: true }] },
  compressor_agent: { method: 'compress', args: [ensureTempDir(), path.join(os.tmpdir(), `claw_zip_${Date.now()}.zip`)] },
  credential_rotator: { method: 'generatePassword', args: [] },
  click_by_text: { method: 'clickByText', args: ['OK'], isStatic: true },
  strategy_optimizer: { method: 'optimize', args: [[{ name: 'buy_hold', baseScore: 5 }], { ram: 80 }] },
  file_archiver: { method: 'zip', args: [ensureTempFile(), path.join(os.tmpdir(), `claw_arch_${Date.now()}.zip`)] },
  reasoning_engine: { method: 'reason', args: [{ ram: 92, disk: 50 }] },
  agent_swarm: { method: 'runTask', args: ['test', {}] },
  process_killer: { method: 'byPid', args: [99999] },
  test_runner: { method: 'runNodeTest', args: [ensureJsFile()] },
  code_agent: { method: 'syntaxCheck', args: [ensureJsFile()], isStatic: true },
  deploy_agent: { method: 'deployDirectory', args: [ensureTempDir(), path.join(os.tmpdir(), `claw_deploy_${Date.now()}`)] },
  long_term_memory: { method: 'search', args: ['test'] },
  memory_consolidator: { method: 'getRecent', args: [7] },
  risk_engine: { method: 'assessAction', args: [{ action: 'test', risk: 'low' }] },
  content_factory: { method: 'generateSocialPost', args: ['test'] },
  anomaly_detector: { method: 'detectZScore', args: [[1, 2, 3, 100]] },
  speech_agent: { method: 'speak', args: ['hello world'], isStatic: true },
  notify_engine: { method: 'notify', args: ['test', 'hello'] },
  polyglot_coder: { method: 'run', args: ['javascript', 'console.log(1)'] },
  form_filler: { method: 'fillFields', args: [[{ name: 'username', value: 'test' }]] },
};

function inferArg(paramName, index, total) {
  const p = paramName.toLowerCase();
  if (p.includes('path') || p === 'file' || p === 'source' || p === 'destination' || p === 'dest' || p === 'filePath' || p === 'dir' || p === 'directory' || p === 'sourcedir' || p === 'downloadDir') {
    if (p === 'dir' || p === 'directory' || p === 'sourcedir' || p === 'downloadDir') return ensureTempDir();
    return ensureTempFile();
  }
  if (p === 'url') return 'https://example.com';
  if (p === 'urls' || p === 'hosts') return ['https://example.com'];
  if (p === 'host') return '1.1.1.1';
  if (p === 'id' || p === 'packageid' || p === 'package_id') return 'Git.Git';
  if (p === 'name' || p === 'process') return 'notepad.exe';
  if (p === 'title' || p === 'text' || p === 'message' || p === 'query' || p === 'prompt' || p === 'language' || p === 'code' || p === 'topic' || p === 'format' || p === 'key' || p === 'value' || p === 'type' || p === 'task' || p === 'algorithm') {
    if (p === 'language') return 'javascript';
    if (p === 'code') return 'console.log(1)';
    if (p === 'algorithm') return 'sha256';
    if (p === 'title') return 'Test';
    return 'test';
  }
  if (p.endsWith('s') || p === 'fields' || p === 'agents' || p === 'strategies' || p === 'data' || p === 'metrics') {
    if (p === 'urls') return ['https://example.com'];
    if (p === 'hosts') return ['1.1.1.1'];
    if (p === 'ids') return ['Git.Git'];
    if (p === 'agents') return [];
    if (p === 'fields') return [{ name: 'test', value: 'value' }];
    if (p === 'strategies') return [{ name: 'buy_hold' }];
    if (p === 'data') return [1, 2, 3, 100];
    if (p === 'metrics') return { sharpe: 1.0 };
    return [];
  }
  if (p === 'pdf' || p === 'pdffile') return ensurePdfFile();
  if (p === 'options' || p === 'config' || p === 'params' || p === 'settings' || p === 'args' || p === 'request' || p === 'input' || p === 'payload') return {};
  if (total === 1) return {};
  return null;
}

function buildArgs(params) {
  return params.map((p, i) => inferArg(p, i, params.length));
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

    let method, args, result;
    const select = METHOD_SELECT[capName];

    if (select && select.isStatic) {
      method = select.method;
      args = select.args;
      result = await runWithTimeout(() => mod[method](...args), 2000);
    } else if (clsName) {
      const instance = new mod[clsName]();
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(instance)).filter(m => typeof instance[m] === 'function' && m !== 'constructor');
      method = select ? select.method : methods.find(m => safeMethods.includes(m));
      if (!method && methods.length > 0) method = methods[0];
      if (!method) {
        log({ capability: capName, success: false, error: 'no methods', duration_ms: Date.now() - start });
        process.exit(1);
      }
      args = select ? select.args : buildArgs(parseParams(instance[method]));
      result = await runWithTimeout(() => instance[method](...args), 2000);
    } else if (fnName) {
      method = select ? select.method : fnName;
      args = select ? select.args : buildArgs(parseParams(mod[method]));
      result = await runWithTimeout(() => mod[method](...args), 2000);
    } else {
      log({ capability: capName, success: false, error: 'no callable exports', duration_ms: Date.now() - start });
      process.exit(1);
    }

    const success = result && result.success !== false;
    const error = result && result.error ? result.error : null;
    const duration = Date.now() - start;
    log({ capability: capName, success, method, duration_ms: duration, error });
    process.exit(success ? 0 : 1);
  } catch(e) {
    log({ capability: capName, success: false, duration_ms: Date.now() - start, error: e.message });
    process.exit(2);
  }
}

setTimeout(() => {
  log({ capability: capName, success: false, error: 'hard process timeout (10s)' });
  process.exit(2);
}, 10000);

main();

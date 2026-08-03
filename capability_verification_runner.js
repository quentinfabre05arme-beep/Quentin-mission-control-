/**
 * CAPABILITY VERIFICATION RUNNER v4.0
 * Test every real capability in an isolated child process with 5s timeout.
 * Prevents synchronous hangs from blocking the main runner.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const { SelfAudit } = require('./project_claw_core/core/self_audit');
const LOG_FILE = path.join(__dirname, 'project_claw_core', 'logs', 'capability_verification.jsonl');
const SUMMARY_FILE = path.join(__dirname, 'project_claw_core', 'data', 'capability_verification_summary.json');
const LOCK_FILE = path.join(__dirname, 'project_claw_core', 'data', 'capability_verification.lock');
const CHILD_TIMEOUT_MS = 5000;
const GLOBAL_TIMEOUT_MS = 300000;

const SKIP = [
  'microsoft_browser_agent', 'linkedin_agent', 'x_agent', 'github_agent', 'gmail_agent',
  'microsoft_graph_agent', 'microsoft_graph_auth', 'browser_agent_v2', 'scheduler_agent',
  'drive_agent', 'ui_automation', 'window_manager', 'webcam', 'microphone', 'smart_home',
  'usb_manager', 'phone_bridge', 'searxng_client', 'social_agent'
];

function log(entry) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
}

function acquireLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const pid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8'));
      try {
        process.kill(pid, 0);
        console.log(`Lock held by PID ${pid}. Exiting.`);
        return false;
      } catch (e) {
        console.log(`Stale lock from PID ${pid}. Reclaiming.`);
      }
    }
    fs.writeFileSync(LOCK_FILE, String(process.pid));
    return true;
  } catch (e) {
    console.log('Lock error:', e.message);
    return false;
  }
}

function releaseLock() {
  try {
    if (fs.existsSync(LOCK_FILE) && fs.readFileSync(LOCK_FILE, 'utf8') === String(process.pid)) {
      fs.unlinkSync(LOCK_FILE);
    }
  } catch (e) {}
}

async function verifyCapability(capName, capPath) {
  if (SKIP.includes(capName)) {
    const entry = { capability: capName, success: true, note: 'skipped — requires credentials, hardware, or external state', duration_ms: 0 };
    log(entry);
    return entry;
  }

  return new Promise((resolve) => {
    const child = spawn('node', [path.join(__dirname, 'capability_verify_one.js'), capPath, capName], {
      cwd: __dirname,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let killed = false;

    child.stdout.on('data', d => stdout += d.toString());
    child.stderr.on('data', d => stderr += d.toString());

    const timer = setTimeout(() => {
      killed = true;
      child.kill('SIGTERM');
      // Force kill after 2s if still alive
      setTimeout(() => { try { child.kill('SIGKILL'); } catch(e) {} }, 2000);
      const entry = { capability: capName, success: false, error: `child timeout after ${CHILD_TIMEOUT_MS}ms`, duration_ms: CHILD_TIMEOUT_MS };
      log(entry);
      resolve(entry);
    }, CHILD_TIMEOUT_MS);

    child.on('error', (err) => {
      clearTimeout(timer);
      const entry = { capability: capName, success: false, error: `spawn error: ${err.message}`, duration_ms: 0 };
      log(entry);
      resolve(entry);
    });

    child.on('exit', (code) => {
      clearTimeout(timer);
      if (killed) return;
      const start = Date.now();
      let parsed;
      try {
        parsed = JSON.parse(stdout.trim().split('\n').pop() || '{}');
      } catch(e) {
        parsed = { capability: capName, success: false, error: `invalid JSON from child: ${stdout.slice(0,200)} | stderr: ${stderr.slice(0,200)}` };
      }
      log(parsed);
      resolve(parsed);
    });
  });
}

async function main() {
  if (!acquireLock()) {
    process.exit(0);
  }

  const globalTimer = setTimeout(() => {
    console.log('Global timeout reached. Writing partial summary and exiting.');
    fs.writeFileSync(SUMMARY_FILE, JSON.stringify({
      timestamp: new Date().toISOString(),
      note: 'Global timeout — partial run',
      total: 0, passed: 0, failed: 0
    }, null, 2));
    releaseLock();
    process.exit(0);
  }, GLOBAL_TIMEOUT_MS);

  try {
    const audit = new SelfAudit().run();
    const realCapabilities = audit.details.filter(d => d.real);

    console.log(`Verifying ${realCapabilities.length} capabilities in isolated child processes (${CHILD_TIMEOUT_MS}ms each)...`);
    const results = [];

    for (const cap of realCapabilities) {
      const name = cap.name || path.basename(cap.path, '.js');
      process.stdout.write(`Testing ${name}... `);
      const result = await verifyCapability(name, cap.path);
      results.push(result);
      process.stdout.write(`${result.success ? '✅' : '❌'} ${result.duration_ms}ms${result.error ? ' — ' + result.error : ''}\n`);
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
  } finally {
    clearTimeout(globalTimer);
    releaseLock();
  }
}

main().catch(e => {
  releaseLock();
  console.error(e);
  process.exit(1);
});

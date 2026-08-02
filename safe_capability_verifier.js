/**
 * SAFE CAPABILITY BATCH VERIFIER
 * Verify all non-blocking, non-browser, non-hardware capabilities.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { SelfAudit } = require('./project_claw_core/core/self_audit');
const { CapabilityInvoker } = require('./project_claw_core/core/capability_invoker');

const LOG_FILE = path.join(__dirname, 'project_claw_core', 'logs', 'safe_verification.jsonl');
const SUMMARY_FILE = path.join(__dirname, 'project_claw_core', 'data', 'safe_verification_summary.json');

// Skip capabilities that can hang/block: browser, process launch, hardware, long network, GUI
const SKIP = [
  'microsoft_browser_agent', 'linkedin_agent', 'x_agent', 'github_agent', 'gmail_agent',
  'microsoft_graph_agent', 'microsoft_graph_auth', 'browser_agent_v2', 'click_by_text',
  'ui_automation', 'process_automation', 'process_killer', 'window_manager',
  'window_automation', 'webcam', 'microphone', 'screen_recorder', 'smart_home',
  'phone_bridge', 'speech_agent', 'vision_v2', 'form_filler', 'proxy_server_agent',
  'video_editor_agent', 'network_speed_tester', 'file_archiver', 'compressor_agent',
  'deploy_agent', 'package_installer', 'registry_manager', 'scheduler_agent',
  'auto_updater', 'rollback_manager', 'slack_agent', 'discord_agent', 'social_agent',
  'notify_engine'
];

const SAFE_METHODS = {
  system_health_monitor: { method: 'getHealth' },
  capability_registry: { method: 'build' },
  self_audit: { method: 'run', timeout: 30000 },
  market_watcher: { method: 'getTrend', args: ['BTC'] },
  status_reporter: { method: 'generate' },
  git_agent: { method: 'status' },
  file_hygiene: { method: 'scanDirectory', args: ['project_claw_core/logs'] },
  web_monitor: { method: 'checkAll' },
  anomaly_detector: { method: 'detectThreshold', args: [{ value: 10 }, 5] },
  rate_limiter: { method: 'allow', args: ['test-key'] },
  circuit_breaker: { method: 'call', args: [() => Promise.resolve('ok')] },
  hash_agent: { method: 'hashString', args: ['test'] },
  file_organizer: { method: 'organize', args: ['project_claw_core/logs'] },
  file_indexer: { method: 'indexDirectory', args: ['project_claw_core/core'] },
  drive_indexer: { method: 'indexDrive', args: ['C:\\Users\\quent\\.openclaw'] },
  sync_manager: { method: 'syncDirectory', args: ['project_claw_core/core', 'project_claw_core/core_backup_verify'] },
  usb_manager: { method: 'list' },
  battery_manager: { method: 'getStatus' },
  temperature_monitor: { method: 'read' },
  clipboard_manager: { method: 'getText' },
  clipboard_ocr_agent: { method: 'readClipboard' },
  long_term_memory: { method: 'get', args: ['test', 'key'] },
  memory_consolidator: { method: 'consolidateDaily', args: ['2026-08-02'] },
  vector_brain: { method: 'search', args: [[1, 0.9, 0.8]] },
  sqlite_brain: { method: 'get', args: ['test'] },
  store_manager: { method: 'list' },
  project_manager: { method: 'listProjects' },
  design_agent: { method: 'createPalette', args: ['test'] },
  content_factory: { method: 'generateSocialPost', args: ['BTC', 'bullish', 63000] },
  doc_generator: { method: 'generateForFile', args: ['project_claw_core/core/self_audit.js'] },
  business_intelligence: { method: 'generateDashboardReport' },
  risk_engine: { method: 'assessAction', args: [{ type: 'test' }] },
  reasoning_engine: { method: 'reason', args: [{ ram: 95 }] },
  learning_engine: { method: 'recommend', args: ['test'] },
  strategy_optimizer: { method: 'optimize', args: [[{ name: 'a', baseScore: 1 }], {}] },
  agent_swarm: { method: 'runTask', args: ['test'] },
  feedback_loop: { method: 'getOpen' },
  audit_logger: { method: 'log', args: ['verify', 'runner', {}] },
  credential_rotator: { method: 'rotate', args: ['test', 'user@example.com'] },
  secure_vault: { method: 'listServices' },
  planner: { method: 'createPlan', args: ['test', ['step1']] },
  task_graph: { method: 'run' },
  polyglot_coder: { method: 'run', args: ['javascript', 'console.log(1+1)'] },
  test_runner: { method: 'runCommand', args: ['node -e "console.log(1+1)"'] },
  build_loop_optimizer: { method: 'recommend' },
  capability_invoker: { method: 'list' },
  unified_orchestrator: { method: 'status' },
  unified_master_orchestrator: { method: 'status' },
  health_dashboard: { method: 'generate' },
  network_monitor: { method: 'getInterfaces' },
  predictive_maintenance: { method: 'run' },
  research_agent: { method: 'research', args: ['BTC news'] },
  code_agent: { method: 'analyzeProject', args: ['project_claw_core/core'] },
  pdf_reader_agent: { method: 'extractText', args: [''] },
  trading_agent: { method: 'status' },
  rss_agent: { method: 'readFeed', args: ['https://techcrunch.com/feed/'] },
  calendar_agent: { method: 'listEvents', args: [7] },
  drive_agent: { method: 'listFiles' },
  aws_agent: { method: 'listBuckets' },
  docker_agent: { method: 'listContainers' },
  stripe_agent: { method: 'status' },
  vpn_agent: { method: 'listConnections' },
  calendar_agent: { method: 'listEvents', args: [7] },
  self_goal_generator: { method: 'generateGoals' },
  orchestrator: { method: 'run' },
  financial_guardrail: { method: 'assess' }
};

function log(entry) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
}

async function runWithTimeout(fn, ms = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    Promise.resolve(fn()).then(r => { clearTimeout(timer); resolve(r); }).catch(e => { clearTimeout(timer); reject(e); });
  });
}

async function verifyCapability(capName, invoker) {
  if (SKIP.includes(capName)) {
    return { capability: capName, success: true, skipped: true, note: 'blocking/hardware/browser — skipped' };
  }
  
  const cfg = SAFE_METHODS[capName] || { method: 'run' };
  const start = Date.now();
  try {
    const result = await runWithTimeout(() => invoker.invoke(capName, cfg.method, cfg.args || []), cfg.timeout || 8000);
    const duration = Date.now() - start;
    const success = result.success === true || (result.success !== false && !result.error);
    const entry = { capability: capName, method: cfg.method, success, duration_ms: duration, error: result.error || null };
    log(entry);
    return entry;
  } catch(e) {
    const entry = { capability: capName, method: cfg.method, success: false, duration_ms: Date.now() - start, error: e.message };
    log(entry);
    return entry;
  }
}

async function main() {
  const audit = new SelfAudit().run();
  const realCapabilities = audit.details.filter(d => d.real);
  const invoker = new CapabilityInvoker();
  
  console.log(`Safe verification of ${realCapabilities.length} capabilities...`);
  const results = [];
  
  for (const cap of realCapabilities) {
    const name = cap.name || path.basename(cap.path, '.js');
    const result = await verifyCapability(name, invoker);
    results.push(result);
    process.stdout.write(`${result.skipped ? '⏭️' : (result.success ? '✅' : '❌')} ${name}: ${result.skipped ? 'skipped' : (result.success ? result.duration_ms + 'ms' : result.error)}\n`);
  }
  
  const verified = results.filter(r => r.success && !r.skipped).length;
  const skipped = results.filter(r => r.skipped).length;
  const failed = results.length - verified - skipped;
  
  const summary = {
    timestamp: new Date().toISOString(),
    total: results.length,
    verified,
    skipped,
    failed,
    failed_capabilities: results.filter(r => !r.success && !r.skipped).map(r => r.capability)
  };
  
  fs.writeFileSync(SUMMARY_FILE, JSON.stringify(summary, null, 2));
  console.log(`\n=== SAFE VERIFICATION COMPLETE ===`);
  console.log(`Verified: ${verified}/${results.length}`);
  console.log(`Skipped: ${skipped}`);
  if (failed > 0) {
    console.log(`Failed: ${failed}`);
    for (const f of summary.failed_capabilities) console.log(`  - ${f}`);
  }
}

main().catch(console.error);

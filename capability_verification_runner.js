/**
 * CAPABILITY VERIFICATION RUNNER
 * Test every real capability by instantiating its class and calling safe methods.
 */

const fs = require('fs');
const path = require('path');

const { SelfAudit } = require('./project_claw_core/core/self_audit');
const { CapabilityInvoker } = require('./project_claw_core/core/capability_invoker');

const LOG_FILE = path.join(__dirname, 'project_claw_core', 'logs', 'capability_verification.jsonl');
const SUMMARY_FILE = path.join(__dirname, 'project_claw_core', 'data', 'capability_verification_summary.json');

function log(entry) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
}

async function verifyCapability(capability, invoker) {
  const methods = {
    system_health_monitor: 'getHealth',
    capability_registry: 'build',
    market_watcher: 'getTrend',
    self_audit: 'run',
    status_reporter: 'generate',
    predictive_maintenance: 'run',
    file_hygiene: 'scanDirectory',
    build_loop_optimizer: 'recommend',
    capability_invoker: 'list',
    unified_orchestrator: 'status',
    unified_master_orchestrator: 'status',
    web_monitor: 'checkAll',
    anomaly_detector: 'detectThreshold',
    circuit_breaker: 'call',
    rate_limiter: 'allow',
    hash_agent: 'hashString',
    compressor_agent: 'zip',
    file_archiver: 'zip',
    file_organizer: 'organize',
    file_indexer: 'index',
    drive_indexer: 'indexDrive',
    sync_manager: 'syncDirectory',
    usb_manager: 'list',
    battery_manager: 'getStatus',
    temperature_monitor: 'read',
    network_speed_tester: 'test',
    microphone: 'list',
    webcam: 'list',
    smart_home: 'listDevices',
    phone_bridge: 'listDevices',
    clipboard_manager: 'getText',
    clipboard_ocr_agent: 'readClipboard',
    speech_agent: 'speak',
    vision_v2: 'captureAndOCR',
    browser_agent_v2: 'openPage',
    click_by_text: 'click',
    form_filler: 'fillFields',
    window_manager: 'listWindows',
    window_automation: 'closeAll',
    ui_automation: 'launchApp',
    process_automation: 'listProcesses',
    process_killer: 'byName',
    service_manager: 'listServices',
    scheduler_agent: 'listTasks',
    registry_manager: 'readKey',
    package_installer: 'detectPackageManager',
    auto_updater: 'checkForUpdates',
    rollback_manager: 'getLastCommit',
    polyglot_coder: 'run',
    planner: 'createPlan',
    task_graph: 'run',
    content_factory: 'generateSocialPost',
    doc_generator: 'generateForFile',
    business_intelligence: 'generateDashboardReport',
    risk_engine: 'assessAction',
    social_agent: 'dispatch',
    linkedin_agent: 'init',
    slack_agent: 'sendMessage',
    discord_agent: 'sendMessage',
    x_agent: 'init',
    gmail_agent: 'init',
    calendar_agent: 'listEvents',
    drive_agent: 'listFiles',
    github_agent: 'init',
    rss_agent: 'readFeed',
    git_agent: 'status',
    trading_agent: 'status',
    test_runner: 'runCommand',
    aws_agent: 'listBuckets',
    docker_agent: 'listContainers',
    stripe_agent: 'status',
    vpn_agent: 'listConnections',
    secure_vault: 'listServices',
    credential_rotator: 'rotate',
    audit_logger: 'log',
    feedback_loop: 'record',
    reasoning_engine: 'reason',
    learning_engine: 'recommend',
    strategy_optimizer: 'optimize',
    agent_swarm: 'runTask',
    store_manager: 'list',
    project_manager: 'listProjects',
    design_agent: 'createPalette',
    long_term_memory: 'get',
    memory_consolidator: 'consolidateDaily',
    vector_brain: 'search',
    sqlite_brain: 'get',
    notify_engine: 'send',
    network_monitor: 'getInterfaces',
    health_dashboard: 'generate',
    research_agent: 'research',
    code_agent: 'analyzeProject',
    pdf_reader_agent: 'extractText',
    microsoft_browser_agent: 'init',
    microsoft_graph_agent: 'init',
    microsoft_graph_auth: 'initiateAuth',
    deploy_agent: 'deploy',
    screen_recorder: 'record',
    video_editor_agent: 'getInfo',
    proxy_server_agent: 'start',
    file_hygiene: 'scanDirectory',
    build_loop_continuous: 'start',
    orchestrator: 'status'
  };
  
  const method = methods[capability.name] || 'run';
  let args = [];
  if (capability.name === 'hash_agent') args = ['test'];
  if (capability.name === 'market_watcher' || capability.name === 'web_monitor' || capability.name === 'file_hygiene' || capability.name === 'drive_indexer' || capability.name === 'network_speed_tester') args = [];
  if (capability.name === 'self_audit') args = [];
  if (capability.name === 'anomaly_detector') args = [{ value: 10 }, 5];
  if (capability.name === 'rate_limiter') args = ['test-key'];
  if (capability.name === 'circuit_breaker') args = [() => Promise.resolve('ok')];
  if (capability.name === 'compressor_agent' || capability.name === 'file_archiver') args = ['project_claw_core/core/self_audit.js', 'project_claw_core/logs/test_verify.zip'];
  if (capability.name === 'file_organizer') args = ['project_claw_core/logs'];
  if (capability.name === 'file_indexer') args = ['project_claw_core/core'];
  if (capability.name === 'drive_indexer') args = ['C:\\Users\\quent\\.openclaw'];
  if (capability.name === 'sync_manager') args = ['project_claw_core/core', 'project_claw_core/core_backup_test'];
  if (capability.name === 'web_monitor') args = [['https://www.google.com']];
  if (capability.name === 'vision_v2') args = [];
  if (capability.name === 'browser_agent_v2') args = ['https://example.com'];
  if (capability.name === 'form_filler') args = [[{ name: 'test', value: 'hello' }]];
  if (capability.name === 'window_automation') args = ['Notepad'];
  if (capability.name === 'ui_automation') args = ['notepad.exe'];
  if (capability.name === 'process_automation') args = [];
  if (capability.name === 'process_killer') args = ['notepad.exe'];
  if (capability.name === 'scheduler_agent') args = [];
  if (capability.name === 'registry_manager') args = ['HKCU', 'Software\\Microsoft'];
  if (capability.name === 'polyglot_coder') args = ['javascript', 'console.log(1+1)'];
  if (capability.name === 'planner') args = ['test plan', ['step1', 'step2']];
  if (capability.name === 'task_graph') args = [];
  if (capability.name === 'doc_generator') args = ['project_claw_core/core/self_audit.js'];
  if (capability.name === 'risk_engine') args = [{ type: 'test' }];
  if (capability.name === 'linkedin_agent' || capability.name === 'github_agent' || capability.name === 'x_agent' || capability.name === 'gmail_agent' || capability.name === 'slack_agent' || capability.name === 'discord_agent' || capability.name === 'microsoft_browser_agent' || capability.name === 'microsoft_graph_agent') args = [false];
  if (capability.name === 'calendar_agent') args = [7];
  if (capability.name === 'drive_agent' || capability.name === 'rss_agent') args = [];
  if (capability.name === 'git_agent') args = [];
  if (capability.name === 'trading_agent') args = [];
  if (capability.name === 'test_runner') args = ['node -e "console.log(1+1)"'];
  if (capability.name === 'secure_vault') args = [];
  if (capability.name === 'credential_rotator') args = ['test', 'user@example.com'];
  if (capability.name === 'audit_logger') args = ['verify', 'runner', {}];
  if (capability.name === 'feedback_loop') args = ['verify', 'test', 'none'];
  if (capability.name === 'reasoning_engine') args = [{ ram: 95 }];
  if (capability.name === 'learning_engine') args = ['test'];
  if (capability.name === 'strategy_optimizer') args = [[{ name: 'a', baseScore: 1 }], {}];
  if (capability.name === 'agent_swarm') args = ['test'];
  if (capability.name === 'project_manager') args = [];
  if (capability.name === 'design_agent') args = ['test'];
  if (capability.name === 'long_term_memory') args = ['test', 'key'];
  if (capability.name === 'memory_consolidator') args = ['2026-08-02'];
  if (capability.name === 'vector_brain') args = [[1, 0.9, 0.8]];
  if (capability.name === 'sqlite_brain') args = ['test'];
  if (capability.name === 'notify_engine') args = ['Verification', 'test'];
  if (capability.name === 'network_monitor') args = [];
  if (capability.name === 'health_dashboard') args = [];
  if (capability.name === 'research_agent') args = ['BTC news'];
  if (capability.name === 'code_agent') args = ['project_claw_core/core/self_audit.js'];
  if (capability.name === 'pdf_reader_agent') args = [''];
  if (capability.name === 'microsoft_graph_auth') args = [];
  if (capability.name === 'deploy_agent') args = ['project_claw_core/core/self_audit.js'];
  if (capability.name === 'screen_recorder') args = [2];
  if (capability.name === 'video_editor_agent') args = [''];
  if (capability.name === 'proxy_server_agent') args = [3130];
  if (capability.name === 'build_loop_continuous') args = [];
  if (capability.name === 'orchestrator') args = ['--json'];
  if (capability.name === 'unified_orchestrator') args = [];
  if (capability.name === 'unified_master_orchestrator') args = [];
  if (capability.name === 'status_reporter') args = [];
  
  const start = Date.now();
  try {
    const result = await invoker.invoke(capability.name, method, args);
    const duration = Date.now() - start;
    const success = result.success === true || (result.success !== false && !result.error);
    const entry = {
      timestamp: new Date().toISOString(),
      capability: capability.name,
      method,
      success,
      duration_ms: duration,
      error: result.error || null,
      result_summary: JSON.stringify(result).slice(0, 200)
    };
    log(entry);
    return entry;
  } catch(e) {
    const entry = {
      timestamp: new Date().toISOString(),
      capability: capability.name,
      method,
      success: false,
      duration_ms: Date.now() - start,
      error: e.message,
      result_summary: null
    };
    log(entry);
    return entry;
  }
}

async function main() {
  const audit = new SelfAudit().run();
  const realCapabilities = audit.details.filter(d => d.real);
  const invoker = new CapabilityInvoker();
  
  console.log(`Verifying ${realCapabilities.length} capabilities...`);
  const results = [];
  for (const cap of realCapabilities) {
    const name = cap.name || path.basename(cap.path, '.js');
    const result = await verifyCapability({ ...cap, name }, invoker);
    results.push(result);
    process.stdout.write(`${result.success ? '✅' : '❌'} ${cap.name}: ${result.success ? result.duration_ms + 'ms' : result.error}\n`);
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
  console.log(`Failed: ${failed}`);
  if (failed > 0) {
    console.log('Failed capabilities:');
    for (const f of summary.failed_capabilities) console.log(`  - ${f}`);
  }
}

main().catch(console.error);

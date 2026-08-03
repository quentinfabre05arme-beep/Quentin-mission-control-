/**
 * Change Generator v3
 * Converts a hypothesis into a concrete, validated code diff.
 * Each builder returns a single contiguous change to keep validation simple.
 */

const fs = require('fs');
const path = require('path');
const { log } = require('./utils');
const { isAnchorKnownBad } = require('./learning_engine');

const CONFIG = require('../config.json');
const NL = '\n'; // real newline for embedding into generated code strings

function readTarget(hypothesis) {
  const target = path.join(CONFIG.workspace, hypothesis.target_file);
  if (!fs.existsSync(target)) {
    log(`Target file missing: ${hypothesis.target_file}`, 'warn');
    return null;
  }
  const raw = fs.readFileSync(target, 'utf8');
  const content = raw.replace(/\r\n/g, '\n');
  return { target, content, lines: content.split(/\n/) };
}

function validate(change, content) {
  return change && content.includes(change.oldText);
}

// ==== Builders =============================================================

function buildTimeoutChange(hypothesis, file, learning) {
  const { content } = file;
  const hasHelper = content.includes('runWithTimeout');
  const hasBrowserWrap = content.includes('runWithTimeout(() => this.browser.research');

  if (hasHelper && hasBrowserWrap) {
    log('Timeout guard already applied to browser research', 'warn');
    return { alreadyApplied: true };
  }

  if (hasHelper && !hasBrowserWrap) {
    const oldText = `const results = await this.browser.research(query, count);`;
    const newText = `const results = await runWithTimeout(() => this.browser.research(query, count), 30000);`;
    const change = { filePath: hypothesis.target_file, oldText, newText };
    if (validate(change, content)) return change;
    return null;
  }

  const oldBlock = `    // Fallback to browser-based research
    if (this.browser) {
      try {
        const results = await this.browser.research(query, count);
        if (results.length > 0) {
          log(\`Browser returned \${results.length} results\`);
          return { source: 'browser', results };
        }
      } catch(e) { log(\`Browser error: \${e.message}\`); }
    }`;
  const helperBlock = `function runWithTimeout(fn, ms) {
  return Promise.race([
    fn(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Research timeout')), ms))
  ]);
}`;
  const newBlock = helperBlock + `\n\n` + oldBlock.replace('const results = await this.browser.research(query, count);', `const results = await runWithTimeout(() => this.browser.research(query, count), 30000);`);
  const change = { filePath: hypothesis.target_file, oldText: oldBlock, newText: newBlock };
  if (validate(change, content) && !isAnchorKnownBad(oldBlock, learning)) return change;
  return null;
}

function buildFunctionalTesterTimeoutChange(hypothesis, file, learning) {
  const { content } = file;
  if (content.includes('TEST_TIMEOUT_MS')) {
    log('Functional tester timeout guard already present', 'warn');
    return { alreadyApplied: true };
  }
  const oldText = `    if (spec.async && raw && typeof raw.then === 'function') {
      result = await raw;
    } else {
      result = normalizeResult(raw);
    }`;
  const newText = `    const TEST_TIMEOUT_MS = 5000;

    if (spec.async && raw && typeof raw.then === 'function') {
      result = await Promise.race([
        raw,
        new Promise((_, reject) => setTimeout(() => reject(new Error('async test timeout')), TEST_TIMEOUT_MS))
      ]);
    } else {
      result = normalizeResult(raw);
    }`;
  const change = { filePath: hypothesis.target_file, oldText, newText };
  if (validate(change, content) && !isAnchorKnownBad(oldText, learning)) return change;
  return null;
}

function buildRouterSeedChange(hypothesis, file, learning) {
  const { content } = file;
  if (content.includes('seedIndexFromUsageTracker')) {
    log('Router index seeding already present', 'warn');
    return { alreadyApplied: true };
  }
  const oldText = `function loadIndex() {
  try {
    return JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  } catch (e) {
    return {};
  }
}`;
  const newText = `function loadIndex() {
  try {
    return JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  } catch (e) {
    return seedIndexFromUsageTracker();
  }
}

function seedIndexFromUsageTracker() {
  try {
    const summary = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'capability_usage_summary.json'), 'utf8'));
    const seeded = {};
    for (const [name, s] of Object.entries(summary)) {
      seeded[name] = {
        calls: s.calls || 0,
        success: s.successes || 0,
        failures: s.failures || 0,
        totalLatencyMs: s.totalLatencyMs || 0,
        avgLatencyMs: s.avgLatencyMs || 0
      };
    }
    return seeded;
  } catch (e) {
    return {};
  }
}`;
  const change = { filePath: hypothesis.target_file, oldText, newText };
  if (validate(change, content) && !isAnchorKnownBad(oldText, learning)) return change;
  return null;
}

function buildMemoryColdPruneChange(hypothesis, file, learning) {
  const { content } = file;
  if (content.includes('pruneOldArchive')) {
    log('Cold archive pruning already present', 'warn');
    return { alreadyApplied: true };
  }
  const oldText = `function forgetOld() {
  const files = listDailyFiles();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - FORGET_DAYS);
  const removed = [];
  for (const f of files) {
    if (f.mtime < cutoff) {
      const archiveDir = path.join(MEMORY_DIR, 'archive');
      fs.mkdirSync(archiveDir, { recursive: true });
      fs.renameSync(f.path, path.join(archiveDir, f.name));
      removed.push(f.name);
    }
  }
  return removed;
}`;
  const newText = `function forgetOld() {
  const files = listDailyFiles();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - FORGET_DAYS);
  const removed = [];
  for (const f of files) {
    if (f.mtime < cutoff) {
      const archiveDir = path.join(MEMORY_DIR, 'archive');
      fs.mkdirSync(archiveDir, { recursive: true });
      fs.renameSync(f.path, path.join(archiveDir, f.name));
      removed.push(f.name);
    }
  }
  return removed.concat(pruneOldArchive());
}

function pruneOldArchive() {
  const archiveDir = path.join(MEMORY_DIR, 'archive');
  if (!fs.existsSync(archiveDir)) return [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const removed = [];
  for (const f of fs.readdirSync(archiveDir)) {
    const p = path.join(archiveDir, f);
    try {
      if (fs.statSync(p).mtime < cutoff) {
        fs.unlinkSync(p);
        removed.push(f);
      }
    } catch (e) {}
  }
  return removed;
}`;
  const change = { filePath: hypothesis.target_file, oldText, newText };
  if (validate(change, content) && !isAnchorKnownBad(oldText, learning)) return change;
  return null;
}

function buildBenchmarkHistoryChange(hypothesis, file, learning) {
  const { content } = file;
  if (content.includes('claw_benchmark_history')) {
    log('Benchmark history tracking already present', 'warn');
    return { alreadyApplied: true };
  }
  const oldText = `  fs.mkdirSync(path.dirname(BENCHMARK_PATH), { recursive: true });
  fs.writeFileSync(BENCHMARK_PATH, JSON.stringify(report, null, 2));
  return report;`;
  const newText = "  fs.mkdirSync(path.dirname(BENCHMARK_PATH), { recursive: true });\n" +
    "  fs.writeFileSync(BENCHMARK_PATH, JSON.stringify(report, null, 2));\n" +
    "  const historyPath = path.join(__dirname, '..', 'project_claw_core', 'data', 'claw_benchmark_history.jsonl');\n" +
    "  fs.appendFileSync(historyPath, JSON.stringify({ ...report, recorded_at: new Date().toISOString() }) + '\\\\n');\n" +
    "  return report;";
  const change = { filePath: hypothesis.target_file, oldText, newText };
  if (validate(change, content) && !isAnchorKnownBad(oldText, learning)) return change;
  return null;
}

function buildPlannerTitleChange(hypothesis, file, learning) {
  const { content } = file;
  if (content.includes("const title = g.title || 'Untitled goal';")) {
    log('Planner title normalization already present', 'warn');
    return { alreadyApplied: true };
  }
  const oldText = `  const weekly = active.slice(0, 3).map(g => ({
    goalId: g.id,
    title: g.title,
    weekTasks: [
      { day: 'Mon', task: \`Research \${g.title}\` },
      { day: 'Tue', task: \`Design \${g.title}\` },
      { day: 'Wed', task: \`Implement \${g.title}\` },
      { day: 'Thu', task: \`Verify \${g.title}\` },
      { day: 'Fri', task: \`Document \${g.title}\` }
    ]
  }));`;
  const newText = `  const weekly = active.slice(0, 3).map(g => {
    const title = g.title || 'Untitled goal';
    return {
      goalId: g.id,
      title,
      weekTasks: [
        { day: 'Mon', task: \`Research \${title}\` },
        { day: 'Tue', task: \`Design \${title}\` },
        { day: 'Wed', task: \`Implement \${title}\` },
        { day: 'Thu', task: \`Verify \${title}\` },
        { day: 'Fri', task: \`Document \${title}\` }
      ]
    };
  });`;
  const change = { filePath: hypothesis.target_file, oldText, newText };
  if (validate(change, content) && !isAnchorKnownBad(oldText, learning)) return change;
  return null;
}

function buildLogRotationChange(hypothesis, file, learning) {
  const { content } = file;
  if (content.includes('rotateLog')) {
    log('Log rotation already present', 'warn');
    return { alreadyApplied: true };
  }
  const oldText = "const LOG_FILE = 'alpha_fund_v3/logs/always_on_daemon.log';\\n\\nfunction log(msg) {\\n" +
    "  const cleanMsg = msg.replace(/[^\\\\x20-\\\\x7E]/g, '?');\\n" +
    "  const entry = `[${new Date().toISOString()}] ${cleanMsg}\\\\n`;\\n" +
    "  fs.mkdirSync('alpha_fund_v3/logs', { recursive: true });\\n" +
    "  fs.appendFileSync(LOG_FILE, entry);\\n" +
    "}";
  const newText = "const LOG_FILE = 'alpha_fund_v3/logs/always_on_daemon.log';\\n\\n" +
    "const MAX_LOG_BYTES = 100 * 1024;\\n\\n" +
    "function rotateLog() {\\n" +
    "  try {\\n" +
    "    if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size \u003e MAX_LOG_BYTES) {\\n" +
    "      const archive = `${LOG_FILE}.${Date.now()}.old`;\\n" +
    "      fs.renameSync(LOG_FILE, archive);\\n" +
    "    }\\n" +
    "  } catch(e) {}\\n" +
    "}\\n\\n" +
    "function log(msg) {\\n" +
    "  const cleanMsg = msg.replace(/[^\\\\x20-\\\\x7E]/g, '?');\\n" +
    "  const entry = `[${new Date().toISOString()}] ${cleanMsg}\\\\n`;\\n" +
    "  fs.mkdirSync('alpha_fund_v3/logs', { recursive: true });\\n" +
    "  rotateLog();\\n" +
    "  fs.appendFileSync(LOG_FILE, entry);\\n" +
    "}";
  const change = { filePath: hypothesis.target_file, oldText, newText };
  if (validate(change, content) && !isAnchorKnownBad(oldText, learning)) return change;
  return null;
}

function buildPrunePlansChange(hypothesis, file) {
  try {
    const data = JSON.parse(file.content);
    if (!Array.isArray(data.plans)) return null;
    const originalCount = data.plans.length;
    const kept = data.plans.filter(p => {
      const label = String(p.title || p.name || p.goal || '').toLowerCase();
      return label !== 'test';
    });
    if (kept.length === originalCount) return null;
    const oldText = JSON.stringify(data, null, 2);
    const newData = { ...data, plans: kept };
    const newText = JSON.stringify(newData, null, 2);
    return { filePath: hypothesis.target_file, oldText, newText };
  } catch (e) {
    return null;
  }
}

function buildRouterFallbackChange(hypothesis, file, learning) {
  const { content } = file;
  if (content.includes('if (!best) {')) {
    log('Router fallback already present', 'warn');
    return { alreadyApplied: true };
  }
  const oldText = `  return {
    task,
    capability: best ? best.name : null,
    path: best ? best.path : null,
    score: bestScore,
    note: best ? null : 'no capability matched'
  };`;
  const newText = `  if (!best) {
    const first = (registry.capabilities || [])[0];
    best = first || null;
  }

  return {
    task,
    capability: best ? best.name : null,
    path: best ? best.path : null,
    score: bestScore,
    note: best ? null : 'no capability matched'
  };`;
  const change = { filePath: hypothesis.target_file, oldText, newText };
  if (validate(change, content) && !isAnchorKnownBad(oldText, learning)) return change;
  return null;
}

function buildMemoryHotCapChange(hypothesis, file, learning) {
  const { content } = file;
  if (content.includes('MAX_HOT_KEYS')) {
    log('Hot-tier size cap already present', 'warn');
    return { alreadyApplied: true };
  }
  const oldText = `function setHot(key, value) {
  const hot = loadHot();
  hot[key] = { value, touched: Date.now() };
  saveHot(hot);
}`;
  const newText = `const MAX_HOT_KEYS = 50;

function setHot(key, value) {
  const hot = loadHot();
  hot[key] = { value, touched: Date.now() };
  const entries = Object.entries(hot);
  if (entries.length > MAX_HOT_KEYS) {
    entries.sort((a, b) => a[1].touched - b[1].touched);
    const toRemove = entries.slice(0, entries.length - MAX_HOT_KEYS);
    for (const [k] of toRemove) delete hot[k];
  }
  saveHot(hot);
}`;
  const change = { filePath: hypothesis.target_file, oldText, newText };
  if (validate(change, content) && !isAnchorKnownBad(oldText, learning)) return change;
  return null;
}

function buildResearchRetryChange(hypothesis, file, learning) {
  const { content } = file;
  if (content.includes('async function retry')) {
    log('Research retry helper already present', 'warn');
    return { alreadyApplied: true };
  }
  const oldText = `function runWithTimeout(fn, ms) {
  return Promise.race([
    fn(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Research timeout')), ms))
  ]);
}`;
  const newText = `function runWithTimeout(fn, ms) {
  return Promise.race([
    fn(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Research timeout')), ms))
  ]);
}

async function retry(fn, retries = 2, delayMs = 500) {
  let last;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw last;
}`;
  const change = { filePath: hypothesis.target_file, oldText, newText };
  if (validate(change, content) && !isAnchorKnownBad(oldText, learning)) return change;
  return null;
}

function buildResearchRetryChange(hypothesis, file, learning) {
  const { content } = file;
  if (content.includes('async function retry')) {
    log('Research retry helper already present', 'warn');
    return { alreadyApplied: true };
  }
  const oldText = `function runWithTimeout(fn, ms) {
  return Promise.race([
    fn(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Research timeout')), ms))
  ]);
}`;
  const newText = `function runWithTimeout(fn, ms) {
  return Promise.race([
    fn(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Research timeout')), ms))
  ]);
}

async function retry(fn, retries = 2, delayMs = 500) {
  let last;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw last;
}`;
  const change = { filePath: hypothesis.target_file, oldText, newText };
  if (validate(change, content) && !isAnchorKnownBad(oldText, learning)) return change;
  return null;
}

function buildUnifiedMasterMetricsChange(hypothesis, file, learning) {
  const { content } = file;
  if (content.includes('unified_master_metrics.jsonl')) {
    log('Unified master metrics logging already present', 'warn');
    return { alreadyApplied: true };
  }
  const oldText = `      this.state.cycles++;
      this.state.last_cycle = new Date().toISOString();
      this.state.actions = actions.slice(-20);
      this.state.duration_ms = Date.now() - start;
      saveState(this.state);

      log(\`Cycle complete in \${this.state.duration_ms}ms\`);`;
  const newText = `      this.state.cycles++;
      this.state.last_cycle = new Date().toISOString();
      this.state.actions = actions.slice(-20);
      this.state.duration_ms = Date.now() - start;
      saveState(this.state);

      const metricsPath = path.join(WORKSPACE, 'project_claw_core', 'logs', 'unified_master_metrics.jsonl');
      fs.mkdirSync(path.dirname(metricsPath), { recursive: true });
      fs.appendFileSync(metricsPath, JSON.stringify({ cycle: this.state.cycles, duration_ms: this.state.duration_ms, timestamp: this.state.last_cycle }) + '\\n');

      log(\`Cycle complete in \${this.state.duration_ms}ms\`);`;
  const change = { filePath: hypothesis.target_file, oldText, newText };
  if (validate(change, content) && !isAnchorKnownBad(oldText, learning)) return change;
  return null;
}

function buildUsageHistogramChange(hypothesis, file, learning) {
  const { content } = file;
  if (content.includes('maxLatencyMs')) {
    log('Max latency tracking already present', 'warn');
    return { alreadyApplied: true };
  }
  const oldText = `  s.avgLatencyMs = s.totalLatencyMs / s.calls;
  s.winRate = s.successes / s.calls;
  summary[capName] = s;
  saveSummary(summary);`;
  const newText = `  s.avgLatencyMs = s.totalLatencyMs / s.calls;
  s.winRate = s.successes / s.calls;
  s.maxLatencyMs = Math.max(s.maxLatencyMs || 0, entry.latencyMs);
  summary[capName] = s;
  saveSummary(summary);`;
  const change = { filePath: hypothesis.target_file, oldText, newText };
  if (validate(change, content) && !isAnchorKnownBad(oldText, learning)) return change;
  return null;
}

function buildDiskGuardChange(hypothesis, file, learning) {
  const { content } = file;
  if (content.includes('DISK_BREAK_PCT')) {
    log('Disk space guard already present', 'warn');
    return { alreadyApplied: true };
  }
  const oldText = `function rotateLog() {
  try {
    if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > MAX_LOG_BYTES) {
      const archive = \`\${LOG_FILE}.\${Date.now()}.old\`;
      fs.renameSync(LOG_FILE, archive);
    }
  } catch(e) {}
}`;
  const newText = `function rotateLog() {
  try {
    const out = execSync('wmic logicaldisk get size,freespace /format:csv', { windowsHide: true, encoding: 'utf8' });
    const lines = out.trim().split('\\n').filter(l => l.includes(','));
    const last = lines[lines.length - 1];
    const parts = last.split(',');
    const free = parseInt(parts[parts.length - 2], 10);
    const size = parseInt(parts[parts.length - 1], 10);
    if (free && size && ((size - free) / size) * 100 >= 97) return;

    if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > MAX_LOG_BYTES) {
      const archive = \`\${LOG_FILE}.\${Date.now()}.old\`;
      fs.renameSync(LOG_FILE, archive);
    }
  } catch(e) {}
}`;
  const change = { filePath: hypothesis.target_file, oldText, newText };
  if (validate(change, content) && !isAnchorKnownBad(oldText, learning)) return change;
  return null;
}

// ==== Generic dynamic builders ============================================

function buildInputValidationChange(hypothesis, file, learning) {
  const { content } = file;
  if (content.includes('// Input validation added by improvement engine')) {
    log('Input validation already applied', 'warn');
    return { alreadyApplied: true };
  }
  // Find first function with a single parameter named query/input/data/msg
  const match = content.match(/function\s+(\w+)\s*\(\s*(query|input|data|msg|key|value)\s*\)\s*\{/);
  if (!match) return null;
  const [fullMatch, fnName, param] = match;
  const oldText = fullMatch;
  const guard = param === 'value'
    ? `  if (${param} === undefined || ${param} === null) {\n    console.warn(\`\${fnName} called with invalid ${param}\`);\n    return undefined;\n  }\n  // Input validation added by improvement engine\n`
    : `  if (!${param} && ${param} !== 0 && ${param} !== '') {\n    console.warn(\`\${fnName} called with empty ${param}\`);\n    return ${param === 'query' ? "''" : (param === 'value' ? 'undefined' : 'null')};\n  }\n  // Input validation added by improvement engine\n`;
  const newText = fullMatch + '\n' + guard.replace(/\${fnName}/g, fnName);
  const change = { filePath: hypothesis.target_file, oldText, newText };
  if (validate(change, content) && !isAnchorKnownBad(oldText, learning)) return change;
  return null;
}

function buildErrorLoggingChange(hypothesis, file, learning) {
  const { content } = file;
  if (content.includes('// Error logging added by improvement engine')) {
    log('Error logging already applied', 'warn');
    return { alreadyApplied: true };
  }
  // Find first exported async function and wrap its body
  const match = content.match(/async function\s+(\w+)\s*\([^)]*\)\s*\{/);
  if (!match) return null;
  const fnName = match[1];
  const startIdx = content.indexOf(match[0]) + match[0].length;
  // Find matching closing brace at depth 0
  let depth = 1;
  let i = startIdx;
  while (i < content.length && depth > 0) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') depth--;
    i++;
  }
  const body = content.slice(startIdx, i - 1);
  const oldText = match[0] + body + '}';
  const newText = match[0] + '\n  // Error logging added by improvement engine\n  try {' + body + '\n  } catch (e) {\n    log(`Error in ' + fnName + ': ${e.message}`);\n    throw e;\n  }\n}';
  const change = { filePath: hypothesis.target_file, oldText, newText };
  if (validate(change, content) && !isAnchorKnownBad(oldText, learning)) return change;
  return null;
}

function buildMetricsPersistenceChange(hypothesis, file, learning) {
  const { content } = file;
  if (content.includes('metrics.jsonl')) {
    log('Metrics persistence already applied', 'warn');
    return { alreadyApplied: true };
  }
  // Find first async function that returns something and append metrics write before return
  const match = content.match(/async function\s+(\w+)\s*\([^)]*\)\s*\{/);
  if (!match) return null;
  const fnName = match[1];
  // Look for a return statement inside the function
  const funcStart = content.indexOf(match[0]);
  let depth = 1;
  let i = funcStart + match[0].length;
  while (i < content.length && depth > 0) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') depth--;
    i++;
  }
  const funcBody = content.slice(funcStart, i);
  const returnMatch = funcBody.match(/\n(\s*)return\s+([\w.]+)\s*;/);
  if (!returnMatch) return null;
  const oldText = returnMatch[0];
  const indent = returnMatch[1];
  const newText = `${indent}fs.appendFileSync(path.join(__dirname, '..', 'logs', '${fnName}_metrics.jsonl'), JSON.stringify({ ts: new Date().toISOString(), result: ${returnMatch[2]} }) + '\\n');\n${indent}// Metrics persistence added by improvement engine\n${oldText}`;
  const change = { filePath: hypothesis.target_file, oldText, newText };
  if (validate(change, content) && !isAnchorKnownBad(oldText, learning)) return change;
  return null;
}

// ==== Router ===============================================================

function buildChange(hypothesis, learning) {
  const file = readTarget(hypothesis);
  if (!file) return null;

  const title = hypothesis.title.toLowerCase();

  if ((title.includes('timeout') || title.includes('browser')) && hypothesis.target_file.includes('research_router')) {
    return buildTimeoutChange(hypothesis, file, learning);
  }

  if (title.includes('timeout') && hypothesis.target_file.includes('capability_functional_tester')) {
    return buildFunctionalTesterTimeoutChange(hypothesis, file, learning);
  }

  if (title.includes('seed') && hypothesis.target_file.includes('capability_router')) {
    return buildRouterSeedChange(hypothesis, file, learning);
  }

  if (title.includes('prune') && hypothesis.target_file.includes('memory_tier')) {
    return buildMemoryColdPruneChange(hypothesis, file, learning);
  }

  if (title.includes('history') && hypothesis.target_file.includes('run_claw_benchmark')) {
    return buildBenchmarkHistoryChange(hypothesis, file, learning);
  }

  if ((title.includes('title') || title.includes('planner')) && hypothesis.target_file.includes('hierarchical_planner')) {
    return buildPlannerTitleChange(hypothesis, file, learning);
  }

  if (title.includes('fallback') && hypothesis.target_file.includes('capability_router')) {
    return buildRouterFallbackChange(hypothesis, file, learning);
  }

  if (title.includes('hot') && hypothesis.target_file.includes('memory_tier')) {
    return buildMemoryHotCapChange(hypothesis, file, learning);
  }

  if (title.includes('retry') && hypothesis.target_file.includes('research_router')) {
    return buildResearchRetryChange(hypothesis, file, learning);
  }

  if (title.includes('metrics') && hypothesis.target_file.includes('unified_master_orchestrator')) {
    return buildUnifiedMasterMetricsChange(hypothesis, file, learning);
  }

  if ((title.includes('histogram') || title.includes('max latency')) && hypothesis.target_file.includes('capability_usage_tracker')) {
    return buildUsageHistogramChange(hypothesis, file, learning);
  }

  if (title.includes('disk') && hypothesis.target_file.includes('always_on_daemon')) {
    return buildDiskGuardChange(hypothesis, file, learning);
  }

  if (title.includes('rotate') && hypothesis.target_file.includes('always_on_daemon')) {
    return buildLogRotationChange(hypothesis, file, learning);
  }

  if (title.includes('prune') && hypothesis.target_file.includes('plans')) {
    return buildPrunePlansChange(hypothesis, file);
  }

  if (title.includes('input validation')) {
    return buildInputValidationChange(hypothesis, file, learning);
  }

  if (title.includes('error logging')) {
    return buildErrorLoggingChange(hypothesis, file, learning);
  }

  if (title.includes('metrics') && !hypothesis.target_file.includes('unified_master_orchestrator')) {
    return buildMetricsPersistenceChange(hypothesis, file, learning);
  }

  if (title.includes('timeout') && !hypothesis.target_file.includes('capability_functional_tester') && !hypothesis.target_file.includes('research_router')) {
    // Generic timeout not implemented yet; avoid false positives
    return null;
  }

  if (title.includes('reliability') && hypothesis.target_file.endsWith('.js')) {
    if (file.content.includes('try {') && file.content.includes('catch')) {
      log('Basic try/catch already present', 'warn');
      return null;
    }
    return null;
  }

  return null;
}

function generate(hypothesis) {
  log(`Building change for: ${hypothesis.title}`);
  const learning = require('./learning_engine').loadLearning();
  const change = buildChange(hypothesis, learning);
  if (!change) return null;
  if (change.alreadyApplied) return change;
  const fullPath = path.join(CONFIG.workspace, change.filePath);
  if (!fs.existsSync(fullPath)) {
    log('Generated change target missing', 'warn');
    return null;
  }
  const content = fs.readFileSync(fullPath, 'utf8').replace(/\r\n/g, '\n');
  if (!validate(change, content)) {
    log('Generated change failed validation against file', 'warn');
    return null;
  }
  return { ...change, hypothesisId: hypothesis.id };
}

module.exports = { generate, buildChange, validate };

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
  const usedInResearch = /runWithTimeout\(\s*\(\)\s*=>\s*(this\.tavily|this\.brave|this\.searxng|this\.legacyAgent|this\.browser)/.test(content);

  if (hasHelper && usedInResearch) {
    log('Timeout guard already applied to research sources', 'warn');
    return { alreadyApplied: true };
  }

  if (hasHelper && !usedInResearch) {
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
  if (content.includes('wmic logicaldisk') || content.includes('DISK_BREAK_PCT')) {
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
  const paramNames = ['query', 'input', 'data', 'msg', 'key', 'value', 'options', 'config', 'params', 'args', 'symbol', 'command', 'payload'];
  const regex = new RegExp(`(async\\s+)?function\\s+(\\w+)\\s*\\(\\s*(${paramNames.join('|')})\\s*[,)]`, 'i');
  const match = content.match(regex);
  if (!match) return null;
  const [, asyncKw, fnName, param] = match;

  // Skip if a guard for this parameter already exists
  const existingGuardPattern = new RegExp(`if\\s*\\(\\s*!\\s*${param}\\s*[|&]|if\\s*\\(\\s*!\\s*${param}\\s*\\)|if\\s*\\(\\s*${param}\\s*===\\s*(undefined|null)\\s*\\)`);
  if (existingGuardPattern.test(content)) {
    log(`Existing guard for ${param} detected`, 'warn');
    return null;
  }

  if (fnName.toLowerCase().includes('log') || fnName.toLowerCase().includes('warn') || fnName.toLowerCase().includes('error')) {
    // Logging helpers are low-value for input validation but still valid; deprioritize
    hypothesis.estimated_impact = 'low';
  }

  const fullMatchStart = content.indexOf(match[0]);
  const sigEnd = content.indexOf('{', fullMatchStart);
  if (sigEnd === -1) return null;
  const sig = content.slice(fullMatchStart, sigEnd + 1);

  let returnVal = 'null';
  if (fnName.toLowerCase().includes('log')) returnVal = 'undefined';
  else if (fnName.toLowerCase().includes('search') || fnName.toLowerCase().includes('find') || fnName.toLowerCase().includes('query')) returnVal = "''";
  else if (fnName.toLowerCase().includes('route')) returnVal = 'null';
  else if (fnName.toLowerCase().includes('list') || fnName.toLowerCase().includes('getall')) returnVal = '[]';

  let guard;
  if (param === 'options' || param === 'config' || param === 'params' || param === 'args' || param === 'payload') {
    guard = `  if (!${param} || typeof ${param} !== 'object') {\n    console.warn(\`\${fnName} called with invalid ${param}\`);\n    return ${returnVal === 'null' ? '{}' : returnVal};\n  }\n  // Input validation added by improvement engine\n`;
  } else {
    guard = `  if (!${param} && ${param} !== 0 && ${param} !== '') {\n    console.warn(\`\${fnName} called with empty ${param}\`);\n    return ${returnVal};\n  }\n  // Input validation added by improvement engine\n`;
  }
  guard = guard.replace(/\${fnName}/g, fnName);
  const newText = sig + '\n' + guard;
  const change = { filePath: hypothesis.target_file, oldText: sig, newText };
  if (validate(change, content) && !isAnchorKnownBad(sig, learning)) return change;
  return null;
}

function buildErrorLoggingChange(hypothesis, file, learning) {
  const { content } = file;
  if (content.includes('// Error logging added by improvement engine')) {
    log('Error logging already applied', 'warn');
    return { alreadyApplied: true };
  }
  // Match first function declaration (async or not)
  const match = content.match(/(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{/);
  if (!match) return null;
  const fnName = match[1];
  const startIdx = content.indexOf(match[0]) + match[0].length;
  let depth = 1;
  let i = startIdx;
  while (i < content.length && depth > 0) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') depth--;
    i++;
  }
  const body = content.slice(startIdx, i - 1).trim();

  // Skip if the body is already wrapped in try/catch at the top level
  if (body.startsWith('try {') && body.includes('\n  } catch')) {
    log('Function already has top-level try/catch', 'warn');
    return null;
  }

  const oldText = match[0] + body + '}';
  const newText = match[0] + '\n  // Error logging added by improvement engine\n  try {' + body + '\n  } catch (e) {\n    console.error(`Error in ' + fnName + ': ${e.message}`);\n    throw e;\n  }\n}';
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
  if (!content.includes("require('fs')")) {
    log('File does not import fs; skipping metrics persistence', 'warn');
    return null;
  }
  const match = content.match(/(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{/);
  if (!match) return null;
  const fnName = match[1];
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

  // Avoid instrumenting tiny helpers like loadRegistry
  if (fnName.toLowerCase().includes('load') || fnName.toLowerCase().includes('seed') || fnName.toLowerCase().includes('parse')) {
    log(`Skipping metrics for helper ${fnName}`, 'warn');
    return null;
  }

  const oldText = returnMatch[0];
  const indent = returnMatch[1];
  const newText = `${indent}fs.appendFileSync(path.join(__dirname, '..', 'logs', '${fnName}_metrics.jsonl'), JSON.stringify({ ts: new Date().toISOString(), result: ${returnMatch[2]} }) + '\\n');\n${indent}// Metrics persistence added by improvement engine\n${oldText}`;
  const change = { filePath: hypothesis.target_file, oldText, newText };
  if (validate(change, content) && !isAnchorKnownBad(oldText, learning)) return change;
  return null;
}

function buildRetryWrapperChange(hypothesis, file, learning) {
  const { content } = file;
  if (content.includes('// Retry wrapper added by improvement engine')) {
    log('Retry wrapper already applied', 'warn');
    return { alreadyApplied: true };
  }
  // Only apply to files that already use external I/O patterns
  const hasExternalCall = /await\s+(fetch|http\.get|https\.get|axios\.|request\(|tavily\.|serper|coingecko|yahoo|twelvedata)/i.test(content);
  if (!hasExternalCall) {
    log('No external I/O call detected; skipping retry wrapper', 'warn');
    return null;
  }

  // Match a standalone external-ish await call
  const patterns = [
    /await\s+(fetch\s*\([^)]*\))\s*;?/,
    /await\s+([a-zA-Z_][\w]*\.request\s*\([^)]*\))\s*;?/,
    /await\s+([a-zA-Z_][\w]*\.[a-zA-Z_][\w]*\s*\([^)]*\))\s*;?/
  ];
  let match = null;
  for (const p of patterns) {
    match = content.match(p);
    if (match) break;
  }
  if (!match) return null;
  const call = match[1].trim();

  // Don't wrap calls that are already inside a loop
  const preceding = content.slice(Math.max(0, content.indexOf(match[0]) - 200), content.indexOf(match[0]));
  if (/for\s*\([^)]*\)\s*\{[^}]*$/.test(preceding) || /for\s*\([^)]*\)\s*\{[^}]*$/.test(preceding)) {
    log('Call is inside a loop; skipping retry wrapper', 'warn');
    return null;
  }

  const oldText = match[0];
  const newText = `// Retry wrapper added by improvement engine\n    let lastErr;\n    let retryResult;\n    for (let attempt = 0; attempt < 3; attempt++) {\n      try {\n        retryResult = await ${call};\n        break;\n      } catch (e) {\n        lastErr = e;\n        if (attempt === 2) throw e;\n        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));\n      }\n    }`;
  const change = { filePath: hypothesis.target_file, oldText, newText };
  if (validate(change, content) && !isAnchorKnownBad(oldText, learning)) return change;
  return null;
}

function buildTavilyCacheChange(hypothesis, file, learning) {
  const { content } = file;
  if (content.includes('// Tavily cache added by improvement engine')) {
    log('Tavily cache already applied', 'warn');
    return { alreadyApplied: true };
  }
  if (!content.includes('async function search(')) {
    log('No search() function found in Tavily client', 'warn');
    return null;
  }
  // Insert a cache lookup at the top of search() and a cache write before return
  const match = content.match(/async function search\([^)]*\)\s*\{/);
  if (!match) return null;
  const fnStart = content.indexOf(match[0]);
  const sigEnd = fnStart + match[0].length;

  let depth = 1, i = sigEnd;
  while (i < content.length && depth > 0) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') depth--;
    i++;
  }
  const body = content.slice(fnStart, i);

  // Find first return in search()
  const returnMatch = body.match(/\n(\s*)return\s+([\w.]+)\s*;/);
  if (!returnMatch) return null;

  const cacheKeyLine = `
  // Tavily cache added by improvement engine
  const cacheKey = JSON.stringify({ query, options });
  const cached = getCache(cacheKey);
  if (cached && Date.now() - cached.ts < 5 * 60 * 1000) return cached.results;
`;
  const cacheWriteLine = `${returnMatch[1]}setCache(cacheKey, { ts: Date.now(), results: ${returnMatch[2]} });\n${returnMatch[1]}// Tavily cache write added by improvement engine\n`;

  const oldText = match[0] + body.slice(match[0].length - fnStart);
  const newText = match[0] + cacheKeyLine + body.slice(match[0].length - fnStart).replace(returnMatch[0], cacheWriteLine + returnMatch[0]);

  const change = { filePath: hypothesis.target_file, oldText, newText };
  if (validate(change, content) && !isAnchorKnownBad(oldText, learning)) return change;
  return null;
}

function buildExperimentImpactChange(hypothesis, file, learning) {
  const { content } = file;
  if (content.includes('// Experiment impact scoring added by improvement engine')) {
    log('Experiment impact scoring already applied', 'warn');
    return { alreadyApplied: true };
  }
  if (!content.includes('function recordOutcome')) return null;
  const returnMatch = content.match(/\n(\s*)return\s+experiment;\s*\n?\s*\}\s*$/);
  if (!returnMatch) return null;
  const oldText = returnMatch[0];
  const indent = returnMatch[1];
  const newText = `${indent}// Experiment impact scoring added by improvement engine\n${indent}experiment.impactScore = calculateImpactScore(experiment);\n${indent}${oldText.trim()}\n\nfunction calculateImpactScore(experiment) {\n${indent}let score = 0;\n${indent}if (experiment.worktree_tests && experiment.worktree_tests.allPassed) score += 2;\n${indent}if (experiment.benchmark_before && experiment.benchmark_after) {\n${indent}  const before = experiment.benchmark_before.passed || 0;\n${indent}  const after = experiment.benchmark_after.passed || 0;\n${indent}  score += (after - before) * 3;\n${indent}}\n${indent}if (experiment.applied && experiment.applied.linesChanged) score += Math.min(3, experiment.applied.linesChanged / 10);\n${indent}return Math.max(0, score);\n${indent}\n`;
  const change = { filePath: hypothesis.target_file, oldText, newText };
  if (validate(change, content) && !isAnchorKnownBad(oldText, learning)) return change;
  return null;
}

function buildSafeJsonParseChange(hypothesis, file, learning) {
  const { content } = file;
  if (content.includes('// Safe JSON.parse added by improvement engine')) {
    log('Safe JSON.parse already applied', 'warn');
    return { alreadyApplied: true };
  }
  // Find a JSON.parse call not already wrapped in try/catch
  const matches = [...content.matchAll(/JSON\.parse\s*\(([^)]+)\)/g)];
  for (const m of matches) {
    const idx = m.index;
    const preceding = content.slice(Math.max(0, idx - 200), idx);
    if (/try\s*\{[^}]*$/.test(preceding)) continue; // already in try block
    const oldText = m[0];
    const newText = `safeJsonParse(${m[1]}) /* Safe JSON.parse added by improvement engine */`;
    const change = { filePath: hypothesis.target_file, oldText, newText };
    if (validate(change, content) && !isAnchorKnownBad(oldText, learning)) {
      // Also need to inject safeJsonParse helper if not present
      if (!content.includes('function safeJsonParse')) {
        const helper = `
// Safe JSON.parse helper added by improvement engine
function safeJsonParse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch (e) {
    console.warn('JSON.parse failed:', e.message);
    return fallback;
  }
}
`;
        const moduleExportMatch = content.match(/module\.exports\s*=\s*\{/);
        if (moduleExportMatch) {
          const helperChange = { filePath: hypothesis.target_file, oldText: moduleExportMatch[0], newText: helper + moduleExportMatch[0] };
          if (validate(helperChange, content)) {
            return { filePath: hypothesis.target_file, oldText: moduleExportMatch[0], newText: helper + moduleExportMatch[0], extra: change };
          }
        }
      }
      return change;
    }
  }
  return null;
}

function buildProcessErrorHandlerChange(hypothesis, file, learning) {
  const { content } = file;
  if (content.includes('// Process error handler added by improvement engine')) {
    log('Process error handler already applied', 'warn');
    return { alreadyApplied: true };
  }
  if (content.includes('process.on(\'unhandledRejection\'') || content.includes('process.on("unhandledRejection"')) {
    log('Unhandled rejection handler already present', 'warn');
    return null;
  }
  const oldText = content.endsWith('\n') ? content.slice(-1) : '';
  const handler = `\n// Process error handler added by improvement engine\nprocess.on('unhandledRejection', (reason, promise) => {\n  console.error('Unhandled rejection at:', promise, 'reason:', reason);\n});\nprocess.on('uncaughtException', err => {\n  console.error('Uncaught exception:', err);\n});\n`;
  // Insert at end of file
  const change = { filePath: hypothesis.target_file, oldText: content.endsWith('\n') ? '\n' : '', newText: handler };
  if (validate(change, content) && !isAnchorKnownBad('\n', learning)) return change;
  return null;
}

function buildHttpTimeoutChange(hypothesis, file, learning) {
  const { content } = file;
  if (content.includes('// HTTP timeout added by improvement engine')) {
    log('HTTP timeout already applied', 'warn');
    return { alreadyApplied: true };
  }
  // Find https.request or http.request options object without timeout
  const match = content.match(/(https?\.request)\s*\((\{[^}]*\})/);
  if (!match) return null;
  const opts = match[2];
  if (opts.includes('timeout')) {
    log('HTTP timeout already present', 'warn');
    return null;
  }
  const oldText = match[0];
  const newText = match[1] + '(' + opts.replace(/\}$/, ', timeout: 20000 // HTTP timeout added by improvement engine\n}') ;
  const change = { filePath: hypothesis.target_file, oldText, newText };
  if (validate(change, content) && !isAnchorKnownBad(oldText, learning)) return change;
  return null;
}

function buildSmokeTestChange(hypothesis, file, learning) {
  const { content, target } = file;
  const match = hypothesis.title.match(/Add smoke test for (\w+)/);
  if (!match) return null;
  const capName = match[1];

  const testDir = path.join(CONFIG.workspace, 'project_claw_core', 'tests');
  const testPath = path.join(testDir, 'all_smoke.test.js');
  let existing = '';
  if (fs.existsSync(testPath)) {
    existing = fs.readFileSync(testPath, 'utf8');
    if (existing.includes(capName)) {
      log(`Smoke test for ${capName} already present`, 'warn');
      return { alreadyApplied: true };
    }
  }

  // Inspect exports to generate a minimal, safe smoke test using Node assert
  const hasClass = content.match(/class\s+(\w+)/);
  const hasMainFn = content.match(/(?:async\s+)?function\s+(\w+)\s*\([^)]*\)/);
  const modulePath = path.relative('project_claw_core/tests', hypothesis.target_file).replace(/\\/g, '/');

  let testBody;
  if (hasClass) {
    const className = hasClass[1];
    const methodNames = ['detect', 'run', 'process', 'get', 'search', 'route', 'execute', 'load', 'save', 'parse', 'analyze', 'update'];
    const methodName = methodNames.find(m => content.includes(m)) || 'run';
    testBody = `// Smoke test: ${capName}\n(function smokeTest() {\n  const assert = require('assert');\n  const { ${className} } = require('${modulePath}');\n  const instance = new ${className}();\n  assert.ok(instance, '${className} should instantiate');\n  const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(instance)).filter(m => typeof instance[m] === 'function' && m !== 'constructor');\n  assert.ok(methods.length > 0, '${className} should have at least one method');\n  console.log('[smoke] ${capName}: OK');\n})();\n`;
  } else if (hasMainFn) {
    const fnName = hasMainFn[1];
    testBody = `// Smoke test: ${capName}\n(function smokeTest() {\n  const assert = require('assert');\n  const { ${fnName} } = require('${modulePath}');\n  assert.ok(${fnName}, '${fnName} should be exported');\n  assert.strictEqual(typeof ${fnName}, 'function', '${fnName} should be a function');\n  console.log('[smoke] ${capName}: OK');\n})();\n`;
  } else {
    testBody = `// Smoke test: ${capName}\n(function smokeTest() {\n  const assert = require('assert');\n  const mod = require('${modulePath}');\n  assert.ok(mod, 'module should load');\n  console.log('[smoke] ${capName}: OK');\n})();\n`;
  }

  const header = `// Smoke tests generated by improvement engine\n`;
  const oldText = existing;
  const newText = existing ? existing + '\n' + testBody : header + testBody;
  const change = {
    filePath: path.relative(CONFIG.workspace, testPath).replace(/\\/g, '/'),
    oldText,
    newText
  };
  if (validate(change, existing) && !isAnchorKnownBad(oldText, learning)) return change;
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

  if (title.includes('smoke test')) {
    return buildSmokeTestChange(hypothesis, file, learning);
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
    log('Generic timeout builder not enabled', 'warn');
    return null;
  }

  if (title.includes('process error') || title.includes('unhandled rejection')) {
    log('Process error handler builder disabled — global handlers belong in entrypoint, not modules', 'warn');
    return null;
  }

  if (title.includes('http timeout') || title.includes('request timeout')) {
    log('HTTP timeout builder disabled — options shape varies too much', 'warn');
    return null;
  }

  if (title.includes('safe json') || title.includes('json parse')) {
    log('Safe JSON.parse builder disabled — requires helper injection', 'warn');
    return null;
  }

  if (title.includes('retry wrapper')) {
    log('Retry wrapper builder disabled — needs case-by-case design', 'warn');
    return null;
  }

  if (title.includes('tavily cache') || (title.includes('cache ttl') && hypothesis.target_file.includes('tavily'))) {
    log('Tavily cache builder disabled — function shape not async/await', 'warn');
    return null;
  }

  if (title.includes('experiment impact') || title.includes('impact scoring')) {
    log('Experiment impact builder disabled — needs careful placement', 'warn');
    return null;
  }

  if (title.includes('reliability') && hypothesis.target_file.endsWith('.js')) {
    log('Generic reliability builder disabled — use smoke tests instead', 'warn');
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

  const isNewFile = change.oldText === '' && !fs.existsSync(fullPath);

  if (!isNewFile && !fs.existsSync(fullPath)) {
    log('Generated change target missing', 'warn');
    return null;
  }

  if (!isNewFile) {
    const content = fs.readFileSync(fullPath, 'utf8').replace(/\r\n/g, '\n');
    if (!validate(change, content)) {
      log('Generated change failed validation against file', 'warn');
      return null;
    }
  }

  return { ...change, hypothesisId: hypothesis.id };
}

module.exports = { generate, buildChange, validate };

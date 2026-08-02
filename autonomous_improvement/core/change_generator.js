/**
 * Change Generator
 * Converts a hypothesis into a concrete, validated code diff.
 * v2: failure-aware anchors + line-number fallback + learning integration.
 */

const fs = require('fs');
const path = require('path');
const { log } = require('./utils');
const { isAnchorKnownBad } = require('./learning_engine');

const CONFIG = require('../config.json');

function readTarget(hypothesis) {
  const target = path.join(CONFIG.workspace, hypothesis.target_file);
  if (!fs.existsSync(target)) {
    log(`Target file missing: ${hypothesis.target_file}`, 'warn');
    return null;
  }
  return { target, content: fs.readFileSync(target, 'utf8'), lines: fs.readFileSync(target, 'utf8').split(/\r?\n/) };
}

function validate(change, content) {
  return change && content.includes(change.oldText);
}

function applyByLineNumber(filePath, startLine, endLine, newLines, content) {
  const lines = content.split(/\r?\n/);
  if (startLine < 1 || endLine > lines.length) return null;
  const oldText = lines.slice(startLine - 1, endLine).join('\n');
  const before = lines.slice(0, startLine - 1);
  const after = lines.slice(endLine);
  const newText = [...before, ...newLines, ...after].join('\n');
  return { oldText, newText };
}

function findLineIndex(lines, pattern) {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(pattern)) return i;
  }
  return -1;
}

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

  // Helper missing: insert helper + wrap browser call in one exact change
  const oldBlock = `    // Fallback to browser-based research\n    if (this.browser) {\n      try {\n        const results = await this.browser.research(query, count);\n        if (results.length > 0) {\n          log(\`Browser returned \${results.length} results\`);\n          return { source: 'browser', results };\n        }\n      } catch(e) { log(\`Browser error: \${e.message}\`); }\n    }`;
  const helperBlock = `function runWithTimeout(fn, ms) {\n  return Promise.race([\n    fn(),\n    new Promise((_, reject) => setTimeout(() => reject(new Error('Research timeout')), ms))\n  ]);\n}`;
  const newBlock = helperBlock + `\n\n` + oldBlock.replace('const results = await this.browser.research(query, count);', `const results = await runWithTimeout(() => this.browser.research(query, count), 30000);`);
  const change = { filePath: hypothesis.target_file, oldText: oldBlock, newText: newBlock };
  if (validate(change, content) && !isAnchorKnownBad(oldBlock, learning)) return change;

  return null;
}

function buildLogRotationChange(hypothesis, file, learning) {
  const { content } = file;
  if (content.includes('rotateLog')) {
    log('Log rotation already present', 'warn');
    return { alreadyApplied: true };
  }
  const oldText = `const LOG_FILE = 'alpha_fund_v3/logs/always_on_daemon.log';\n\nfunction log(msg) {\n  const cleanMsg = msg.replace(/[^\\x20-\\x7E]/g, '?');\n  const entry = \`[\${new Date().toISOString()}] \${cleanMsg}\\n\`;\n  fs.mkdirSync('alpha_fund_v3/logs', { recursive: true });\n  fs.appendFileSync(LOG_FILE, entry);\n}`;
  const newText = `const LOG_FILE = 'alpha_fund_v3/logs/always_on_daemon.log';\n\nconst MAX_LOG_BYTES = 100 * 1024;\n\nfunction rotateLog() {\n  try {\n    if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > MAX_LOG_BYTES) {\n      const archive = \`\${LOG_FILE}.\${Date.now()}.old\`;\n      fs.renameSync(LOG_FILE, archive);\n    }\n  } catch(e) {}\n}\n\nfunction log(msg) {\n  const cleanMsg = msg.replace(/[^\\x20-\\x7E]/g, '?');\n  const entry = \`[\${new Date().toISOString()}] \${cleanMsg}\\n\`;\n  fs.mkdirSync('alpha_fund_v3/logs', { recursive: true });\n  rotateLog();\n  fs.appendFileSync(LOG_FILE, entry);\n}`;
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

function buildChange(hypothesis, learning) {
  const file = readTarget(hypothesis);
  if (!file) return null;

  const title = hypothesis.title.toLowerCase();

  if ((title.includes('timeout') || title.includes('browser')) && hypothesis.target_file.includes('research_router')) {
    return buildTimeoutChange(hypothesis, file, learning);
  }

  if (title.includes('rotate') && hypothesis.target_file.includes('always_on_daemon')) {
    return buildLogRotationChange(hypothesis, file, learning);
  }

  if (title.includes('prune') && hypothesis.target_file.includes('plans')) {
    return buildPrunePlansChange(hypothesis, file);
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
  const content = fs.readFileSync(fullPath, 'utf8');
  if (!validate(change, content)) {
    log('Generated change failed validation against file', 'warn');
    return null;
  }
  return { ...change, hypothesisId: hypothesis.id };
}

module.exports = { generate, buildChange, validate };

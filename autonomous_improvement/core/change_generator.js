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

function buildTimeoutChange(hypothesis, file) {
  const { content } = file;
  const hasHelper = content.includes('runWithTimeout');
  const hasBrowserWrap = content.includes('runWithTimeout(() => this.browser.research');

  if (hasHelper && hasBrowserWrap) {
    log('Timeout guard already applied to browser research', 'warn');
    return null;
  }

  const helperBlock = `function runWithTimeout(fn, ms) {\n  return Promise.race([\n    fn(),\n    new Promise((_, reject) => setTimeout(() => reject(new Error('Research timeout')), ms))\n  ]);\n}`;

  const oldBlock = `    // Fallback to browser-based research\n    if (this.browser) {\n      try {\n        const results = await this.browser.research(query, count);\n        if (results.length > 0) {\n          log(\`Browser returned \${results.length} results\`);\n          return { source: 'browser', results };\n        }\n      } catch(e) { log(\`Browser error: \${e.message}\`); }\n    }`;
  const newBlock = helperBlock + `\n\n` + oldBlock.replace('const results = await this.browser.research(query, count);', `const results = await runWithTimeout(() => this.browser.research(query, count), 30000);`);
  let change = { filePath: hypothesis.target_file, oldText: oldBlock, newText: newBlock };
  if (validate(change, content) && !isAnchorKnownBad(oldBlock)) return change;

  // Fallback: line-based replacement of browser research call
  const lineIdx = findLineIndex(file.lines, 'const results = await this.browser.research(query, count);');
  if (lineIdx >= 0 && !hasBrowserWrap) {
    const replacement = applyByLineNumber(hypothesis.target_file, lineIdx + 1, lineIdx + 1, [`        const results = await runWithTimeout(() => this.browser.research(query, count), 30000);`], content);
    if (replacement) {
      change = { filePath: hypothesis.target_file, oldText: replacement.oldText, newText: replacement.newText };
      if (validate(change, content)) return change;
    }
  }

  return null;
}

function buildLogRotationChange(hypothesis, file) {
  const { content } = file;
  if (content.includes('rotateLog')) {
    log('Log rotation already present', 'warn');
    return null;
  }
  const oldText = `function log(msg) {\n  const cleanMsg = msg.replace(/[^\\x20-\\x7E]/g, '?');\n  const entry = \`[\${new Date().toISOString()}] \${cleanMsg}\\n\`;\n  fs.mkdirSync('alpha_fund_v3/logs', { recursive: true });\n  fs.appendFileSync(LOG_FILE, entry);\n}`;
  const newText = `const MAX_LOG_BYTES = 100 * 1024;\n\nfunction rotateLog() {\n  try {\n    if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > MAX_LOG_BYTES) {\n      const archive = \`\${LOG_FILE}.\${Date.now()}.old\`;\n      fs.renameSync(LOG_FILE, archive);\n    }\n  } catch(e) {}\n}\n\nfunction log(msg) {\n  const cleanMsg = msg.replace(/[^\\x20-\\x7E]/g, '?');\n  const entry = \`[\${new Date().toISOString()}] \${cleanMsg}\\n\`;\n  fs.mkdirSync('alpha_fund_v3/logs', { recursive: true });\n  rotateLog();\n  fs.appendFileSync(LOG_FILE, entry);\n}`;
  let change = { filePath: hypothesis.target_file, oldText, newText };
  if (validate(change, content) && !isAnchorKnownBad(oldText)) return change;

  // Fallback: line-based
  const startLine = findLineIndex(file.lines, 'function log(msg) {');
  const endLine = findLineIndex(file.lines, 'fs.appendFileSync(LOG_FILE, entry);');
  if (startLine >= 0 && endLine > startLine) {
    const replacement = applyByLineNumber(hypothesis.target_file, startLine + 1, endLine + 1, [
      `const MAX_LOG_BYTES = 100 * 1024;`,
      ``,
      `function rotateLog() {`,
      `  try {`,
      `    if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > MAX_LOG_BYTES) {`,
      `      const archive = \`\${LOG_FILE}.\${Date.now()}.old\`;`,
      `      fs.renameSync(LOG_FILE, archive);`,
      `    }`,
      `  } catch(e) {}`,
      `}`,
      ``,
      `function log(msg) {`,
      `  const cleanMsg = msg.replace(/[^\\x20-\\x7E]/g, '?');`,
      `  const entry = \`[\${new Date().toISOString()}] \${cleanMsg}\\n\`;`,
      `  fs.mkdirSync('alpha_fund_v3/logs', { recursive: true });`,
      `  rotateLog();`,
      `  fs.appendFileSync(LOG_FILE, entry);`,
      `}`
    ], content);
    if (replacement) {
      change = { filePath: hypothesis.target_file, oldText: replacement.oldText, newText: replacement.newText };
      if (validate(change, content)) return change;
    }
  }
  return null;
}

function buildPrunePlansChange(hypothesis, file) {
  try {
    const data = JSON.parse(file.content);
    if (!Array.isArray(data.plans)) return null;
    const originalCount = data.plans.length;
    const kept = data.plans.filter(p => String(p.title || p.name || '').toLowerCase() !== 'test');
    if (kept.length === originalCount) return null;
    const oldText = JSON.stringify(data, null, 2);
    const newData = { ...data, plans: kept };
    const newText = JSON.stringify(newData, null, 2);
    return { filePath: hypothesis.target_file, oldText, newText };
  } catch (e) {
    return null;
  }
}

function buildChange(hypothesis) {
  const file = readTarget(hypothesis);
  if (!file) return null;

  const title = hypothesis.title.toLowerCase();

  if ((title.includes('timeout') || title.includes('browser')) && hypothesis.target_file.includes('research_router')) {
    return buildTimeoutChange(hypothesis, file);
  }

  if (title.includes('rotate') && hypothesis.target_file.includes('always_on_daemon')) {
    return buildLogRotationChange(hypothesis, file);
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
  const change = buildChange(hypothesis);
  if (!change) return null;
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

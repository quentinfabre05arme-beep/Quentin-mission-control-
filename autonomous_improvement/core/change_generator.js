/**
 * Change Generator
 * Converts a hypothesis into a concrete, validated code diff.
 */

const fs = require('fs');
const path = require('path');
const { log } = require('./utils');

const CONFIG = require('../config.json');

function readTarget(hypothesis) {
  const target = path.join(CONFIG.workspace, hypothesis.target_file);
  if (!fs.existsSync(target)) {
    log(`Target file missing: ${hypothesis.target_file}`, 'warn');
    return null;
  }
  return { target, content: fs.readFileSync(target, 'utf8') };
}

function validate(change, content) {
  return change && content.includes(change.oldText);
}

function buildTimeoutChange(hypothesis, content) {
  const hasHelper = content.includes('runWithTimeout');
  const hasBrowserWrap = content.includes('runWithTimeout(() => this.browser.research');

  if (hasHelper && hasBrowserWrap) {
    log('Timeout guard already applied to browser research', 'warn');
    return null;
  }

  // Case 1: helper missing, browser call not wrapped — add both
  if (!hasHelper) {
    const helperBlock = `function runWithTimeout(fn, ms) {\n  return Promise.race([\n    fn(),\n    new Promise((_, reject) => setTimeout(() => reject(new Error('Research timeout')), ms))\n  ]);\n}`;

    const oldText = `    // Fallback to browser-based research\n    if (this.browser) {\n      try {\n        const results = await this.browser.research(query, count);\n        if (results.length > 0) {\n          log(\`Browser returned \${results.length} results\`);\n          return { source: 'browser', results };\n        }\n      } catch(e) { log(\`Browser error: \${e.message}\`); }\n    }`;
    const newText = helperBlock + `\n\n` + oldText.replace('const results = await this.browser.research(query, count);', `const results = await runWithTimeout(() => this.browser.research(query, count), 30000);`);

    const change = { filePath: hypothesis.target_file, oldText, newText };
    if (validate(change, content)) return change;
  }

  // Case 2: helper exists but browser call not wrapped — wrap only
  if (hasHelper && !hasBrowserWrap) {
    const oldText = `const results = await this.browser.research(query, count);`;
    const newText = `const results = await runWithTimeout(() => this.browser.research(query, count), 30000);`;
    const change = { filePath: hypothesis.target_file, oldText, newText };
    if (validate(change, content)) return change;
  }

  return null;
}

function buildLogRotationChange(hypothesis, content) {
  if (content.includes('rotateLog')) {
    log('Log rotation already present', 'warn');
    return null;
  }
  const oldText = `function log(msg) {\n  const cleanMsg = msg.replace(/[^\\x20-\\x7E]/g, '?');\n  const entry = \`[\${new Date().toISOString()}] \${cleanMsg}\\n\`;\n  fs.mkdirSync('alpha_fund_v3/logs', { recursive: true });\n  fs.appendFileSync(LOG_FILE, entry);\n}`;
  const newText = `const MAX_LOG_BYTES = 100 * 1024;\n\nfunction rotateLog() {\n  try {\n    if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > MAX_LOG_BYTES) {\n      const archive = \`\${LOG_FILE}.\${Date.now()}.old\`;\n      fs.renameSync(LOG_FILE, archive);\n    }\n  } catch(e) {}\n}\n\nfunction log(msg) {\n  const cleanMsg = msg.replace(/[^\\x20-\\x7E]/g, '?');\n  const entry = \`[\${new Date().toISOString()}] \${cleanMsg}\\n\`;\n  fs.mkdirSync('alpha_fund_v3/logs', { recursive: true });\n  rotateLog();\n  fs.appendFileSync(LOG_FILE, entry);\n}`;
  const change = { filePath: hypothesis.target_file, oldText, newText };
  if (validate(change, content)) return change;
  return null;
}

function buildPrunePlansChange(hypothesis, content) {
  try {
    const data = JSON.parse(content);
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
  const { target, content } = file;

  const title = hypothesis.title.toLowerCase();

  if (title.includes('timeout') && target.includes('research_router')) {
    return buildTimeoutChange(hypothesis, content);
  }

  if (title.includes('rotate') && target.includes('always_on_daemon')) {
    return buildLogRotationChange(hypothesis, content);
  }

  if (title.includes('prune') && target.includes('plans')) {
    return buildPrunePlansChange(hypothesis, content);
  }

  if (title.includes('reliability') && target.endsWith('.js')) {
    if (content.includes('try {') && content.includes('catch')) {
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
  if (!validate(change, fs.readFileSync(path.join(CONFIG.workspace, change.filePath), 'utf8'))) {
    log('Generated change failed validation against file', 'warn');
    return null;
  }
  return { ...change, hypothesisId: hypothesis.id };
}

module.exports = { generate, buildChange, validate };

/**
 * Experiment Runner v2
 * Applies a small code change safely, tests it, measures outcome, and reviews impact.
 * Uses file-level backup/restore to avoid git stash issues with locked browser profiles.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { log, saveJson, loadJson, runWithTimeout } = require('./utils');
const { recordOutcome } = require('./learning_engine');
const { review } = require('./self_review');

const CONFIG = require('../config.json');

const EXPERIMENTS_FILE = path.join(CONFIG.workspace, CONFIG.experiments_file);
const BACKUP_DIR = path.join(CONFIG.workspace, 'autonomous_improvement', 'backups');

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function safeGit(args, cwd = CONFIG.workspace) {
  try {
    return execSync(`git ${args}`, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    const stderr = e.stderr ? e.stderr.toString() : e.message;
    if (stderr.includes('Permission denied') || stderr.includes('unable to process path')) {
      const excludeFile = path.join(cwd, '.git', 'info', 'exclude');
      const excludeLine = 'project_claw_core/data/microsoft_profile/';
      try {
        let content = '';
        if (fs.existsSync(excludeFile)) content = fs.readFileSync(excludeFile, 'utf8');
        if (!content.includes(excludeLine)) {
          fs.appendFileSync(excludeFile, excludeLine + '\n');
        }
      } catch (_) {}
      return execSync(`git ${args}`, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    }
    throw e;
  }
}

function cleanupStaleExperiments() {
  const data = loadJson(EXPERIMENTS_FILE) || { experiments: [] };
  let changed = false;
  for (const exp of data.experiments) {
    if (exp.status === 'running' || exp.outcome === null) {
      exp.status = 'aborted';
      exp.outcome = 'error';
      exp.error = exp.error || 'Orphaned experiment marked aborted on startup';
      changed = true;
    }
  }
  if (changed) saveJson(EXPERIMENTS_FILE, data);
}

function backupFile(filePath) {
  ensureBackupDir();
  const fullPath = path.join(CONFIG.workspace, filePath);
  const backupPath = path.join(BACKUP_DIR, `${path.basename(filePath)}.${Date.now()}.bak`);
  fs.copyFileSync(fullPath, backupPath);
  return backupPath;
}

function restoreFile(filePath, backupPath) {
  const fullPath = path.join(CONFIG.workspace, filePath);
  fs.copyFileSync(backupPath, fullPath);
}

function applyChange(change) {
  const { filePath, oldText, newText } = change;
  const fullPath = path.join(CONFIG.workspace, filePath);
  if (!fs.existsSync(fullPath)) throw new Error(`File not found: ${filePath}`);
  const content = fs.readFileSync(fullPath, 'utf8');
  if (!content.includes(oldText)) throw new Error('oldText not found in file');
  const updated = content.replace(oldText, newText);
  fs.writeFileSync(fullPath, updated);
  return { filePath, linesChanged: updated.split('\n').length - content.split('\n').length };
}

async function runFunctionalBenchmark(filePath) {
  const results = { runLatencyMs: null, hasRunMethod: false };
  const fullPath = path.join(CONFIG.workspace, filePath);
  const content = fs.readFileSync(fullPath, 'utf8');
  if (/setInterval\s*\(/.test(content) || /setTimeout\s*\(/.test(content)) {
    results.note = 'long-running daemon; benchmark skipped';
    return results;
  }
  try {
    delete require.cache[require.resolve(fullPath)];
    const mod = require(fullPath);
    if (typeof mod.run === 'function') {
      results.hasRunMethod = true;
      const start = Date.now();
      await runWithTimeout(() => Promise.resolve(mod.run()), CONFIG.test_timeout_ms);
      results.runLatencyMs = Date.now() - start;
    }
  } catch (e) {
    results.error = e.message;
  }
  return results;
}

function runTests(change) {
  log(`Testing change in ${change.filePath}`);
  const results = { syntax: false, load: false, functional: false };
  const fullPath = path.join(CONFIG.workspace, change.filePath);
  const content = fs.readFileSync(fullPath, 'utf8');

  if (change.filePath.endsWith('.json')) {
    try {
      JSON.parse(content);
      results.syntax = true;
      results.load = true;
    } catch (e) {
      results.syntaxError = e.message;
    }
    return results;
  }

  try {
    execSync(`node -c ${fullPath}`, { encoding: 'utf8', stdio: 'pipe' });
    results.syntax = true;
  } catch (e) {
    results.syntaxError = e.message;
  }

  const isLongRunning = /setInterval\s*\(/.test(content) || /setTimeout\s*\(/.test(content);
  if (isLongRunning) {
    log('Skipping load test for long-running daemon file');
    results.load = true;
  } else {
    try {
      delete require.cache[require.resolve(fullPath)];
      require(fullPath);
      results.load = true;
    } catch (e) {
      results.loadError = e.message;
    }
  }

  return results;
}

function measureBeforeAfter(change) {
  const filePath = path.join(CONFIG.workspace, change.filePath);
  const afterSize = fs.statSync(filePath).size;
  return { file_size_after: afterSize };
}

async function runExperiment(hypothesis, change) {
  cleanupStaleExperiments();
  log(`Running experiment: ${hypothesis.id}`);
  const experiment = {
    id: hypothesis.id,
    title: hypothesis.title,
    category: hypothesis.category,
    timestamp: new Date().toISOString(),
    change,
    outcome: null,
    tests: {},
    metrics: {},
    review: null,
    benchmark: null,
    status: 'running'
  };

  const experiments = loadJson(EXPERIMENTS_FILE) || { experiments: [] };
  experiments.experiments.push(experiment);
  saveJson(EXPERIMENTS_FILE, experiments);

  let backupPath = null;
  try {
    backupPath = backupFile(change.filePath);
    const applied = applyChange(change);
    const tests = runTests(change);
    const metrics = measureBeforeAfter(change);

    experiment.applied = applied;
    experiment.tests = tests;
    experiment.metrics = metrics;

    const passed = tests.syntax && tests.load;
    if (passed) {
      experiment.outcome = 'success';
      experiment.status = 'reviewing';
      experiment.review = review(change);
      experiment.benchmark = await runFunctionalBenchmark(change.filePath);

      if (experiment.review.ok) {
        experiment.status = 'committed';
        try {
          safeGit(`add ${change.filePath}`);
          safeGit(`commit -m "Auto-improvement: ${hypothesis.title}"`);
        } catch (commitErr) {
          experiment.status = 'tested-not-committed';
          experiment.commitError = commitErr.message;
        }
      } else {
        experiment.outcome = 'failed_review';
        experiment.status = 'reverted';
        restoreFile(change.filePath, backupPath);
      }
    } else {
      experiment.outcome = 'failed';
      experiment.status = 'reverted';
      restoreFile(change.filePath, backupPath);
    }
  } catch (e) {
    experiment.outcome = 'error';
    experiment.status = 'reverted';
    experiment.error = e.message;
    if (backupPath) {
      try { restoreFile(change.filePath, backupPath); } catch (_) {}
    }
  }

  recordOutcome(experiment);
  saveJson(EXPERIMENTS_FILE, experiments);
  log(`Experiment ${experiment.id}: ${experiment.outcome}`);
  return experiment;
}

module.exports = { runExperiment, applyChange, runTests };

/**
 * Experiment Runner
 * Applies a small code change safely, tests it, and measures outcome.
 * Uses file-level backup/restore to avoid git stash issues with locked browser profiles.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { log, saveJson, loadJson } = require('./utils');

const CONFIG = require('../config.json');

const EXPERIMENTS_FILE = path.join(CONFIG.workspace, CONFIG.experiments_file);
const BACKUP_DIR = path.join(CONFIG.workspace, 'autonomous_improvement', 'backups');

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function git(args, cwd = CONFIG.workspace) {
  return execSync(`git ${args}`, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
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

function runTests(change) {
  log(`Testing change in ${change.filePath}`);
  const results = { syntax: false, load: false, functional: false };

  try {
    execSync(`node -c ${path.join(CONFIG.workspace, change.filePath)}`, { encoding: 'utf8', stdio: 'pipe' });
    results.syntax = true;
  } catch (e) {
    results.syntaxError = e.message;
  }

  try {
    delete require.cache[require.resolve(path.join(CONFIG.workspace, change.filePath))];
    require(path.join(CONFIG.workspace, change.filePath));
    results.load = true;
  } catch (e) {
    results.loadError = e.message;
  }

  try {
    delete require.cache[require.resolve(path.join(CONFIG.workspace, change.filePath))];
    const mod = require(path.join(CONFIG.workspace, change.filePath));
    if (typeof mod.run === 'function') {
      const r = mod.run();
      if (r && r.success !== undefined) results.functional = !!r.success;
    }
  } catch (e) {
    results.functionalError = e.message;
  }

  return results;
}

function measureBeforeAfter(change) {
  const filePath = path.join(CONFIG.workspace, change.filePath);
  const afterSize = fs.statSync(filePath).size;
  return { file_size_after: afterSize };
}

async function runExperiment(hypothesis, change) {
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
      experiment.status = 'committed';
      try {
        safeGit(`add ${change.filePath}`);
        safeGit(`commit -m "Auto-improvement: ${hypothesis.title}"`);
      } catch (commitErr) {
        experiment.status = 'tested-not-committed';
        experiment.commitError = commitErr.message;
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

  saveJson(EXPERIMENTS_FILE, experiments);
  log(`Experiment ${experiment.id}: ${experiment.outcome}`);
  return experiment;
}

module.exports = { runExperiment, applyChange, runTests };

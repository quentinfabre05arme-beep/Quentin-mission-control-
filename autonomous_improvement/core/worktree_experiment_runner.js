/**
 * Worktree Experiment Runner v1.0
 * Tests a change in an isolated git worktree before applying to main workspace.
 * Enables parallel experiment trials and safer self-improvement sandboxing.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const CONFIG = require('../config.json');

function runGit(args, cwd = CONFIG.workspace) {
  return execSync(`git ${args.join(' ')}`, { cwd, encoding: 'utf8', windowsHide: true });
}

function createWorktree(branchName) {
  const worktreePath = path.join(CONFIG.workspace, '.experiment_worktrees', branchName);
  fs.mkdirSync(path.dirname(worktreePath), { recursive: true });
  // Remove existing worktree if stale
  try { runGit(['worktree', 'remove', '-f', worktreePath]); } catch(e) {}
  try { fs.rmSync(worktreePath, { recursive: true, force: true }); } catch(e) {}
  runGit(['worktree', 'add', '-b', branchName, worktreePath]);
  return worktreePath;
}

function removeWorktree(worktreePath) {
  try { runGit(['worktree', 'remove', '-f', worktreePath]); } catch(e) {}
  try { fs.rmSync(worktreePath, { recursive: true, force: true }); } catch(e) {}
}

function applyChangeInWorktree(change, worktreePath) {
  if (!change || !change.filePath) throw new Error('Invalid change object');
  const fullPath = path.join(worktreePath, change.filePath);
  if (!fs.existsSync(fullPath)) throw new Error(`Target missing in worktree: ${change.filePath}`);
  const content = fs.readFileSync(fullPath, 'utf8').replace(/\r\n/g, '\n');
  if (!content.includes(change.oldText)) throw new Error('oldText not found in worktree');
  const updated = content.replace(change.oldText, change.newText);
  fs.writeFileSync(fullPath, updated);
}

function runTests(worktreePath) {
  const results = { syntax: true, load: true, functional: true, external: true, benchmark: true };
  try {
    execSync('node -c autonomous_improvement/core/change_generator.js', { cwd: worktreePath, windowsHide: true, stdio: 'pipe' });
    execSync('node -c autonomous_improvement/core/experiment_runner.js', { cwd: worktreePath, windowsHide: true, stdio: 'pipe' });
    execSync('node -c project_claw_core/core/capability_router.js', { cwd: worktreePath, windowsHide: true, stdio: 'pipe' });
    execSync('node capability_verification_runner.js once --json', { cwd: worktreePath, windowsHide: true, stdio: 'pipe', timeout: 120000 });
    execSync('node scripts/run_claw_benchmark.js', { cwd: worktreePath, windowsHide: true, stdio: 'pipe', timeout: 60000 });
    execSync('node scripts/run_external_benchmark.js', { cwd: worktreePath, windowsHide: true, stdio: 'pipe', timeout: 120000 });
  } catch(e) {
    results.error = e.message;
    results.allPassed = false;
    return results;
  }
  results.allPassed = true;
  return results;
}

function runExperimentInWorktree(hypothesis, change) {
  const branchName = `exp-${hypothesis.id.replace(/[^a-z0-9]/gi, '-').slice(0, 40)}-${crypto.randomBytes(4).toString('hex')}`;
  const worktreePath = createWorktree(branchName);
  try {
    applyChangeInWorktree(change, worktreePath);
    const tests = runTests(worktreePath);
    return { success: tests.allPassed, worktreePath, branchName, tests, error: tests.error };
  } catch(e) {
    return { success: false, worktreePath, branchName, error: e.message };
  }
}

function cleanup(worktreePath) {
  removeWorktree(worktreePath);
}

module.exports = { runExperimentInWorktree, cleanup, createWorktree, removeWorktree };

if (require.main === module) {
  const ChangeGenerator = require('./change_generator');
  const HypothesisGenerator = require('./hypothesis_generator');
  const hypotheses = HypothesisGenerator.generate();
  const h = hypotheses.find(hy => hy.title.toLowerCase().includes('metrics'));
  if (!h) { console.log('no test hypothesis'); process.exit(1); }
  const change = ChangeGenerator.generate(h);
  if (!change) { console.log('no change generated'); process.exit(1); }
  console.log('Testing', h.title, 'in worktree...');
  const result = runExperimentInWorktree(h, change);
  console.log(JSON.stringify(result, null, 2));
  cleanup(result.worktreePath);
}

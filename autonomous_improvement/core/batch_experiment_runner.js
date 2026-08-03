/**
 * Batch Experiment Runner v1.0
 * Runs multiple independent experiments in parallel git worktrees.
 * Only experiments with non-overlapping target files are run together.
 */

const { runExperimentInWorktree, cleanup } = require('./worktree_experiment_runner');
const ChangeGenerator = require('./change_generator');
const { log } = require('./utils');

function targetsOverlap(changes) {
  const files = changes.map(c => c?.filePath).filter(Boolean);
  return new Set(files).size !== files.length;
}

function filterNonOverlapping(hypothesesWithChanges, maxBatch = 3) {
  const selected = [];
  const usedFiles = new Set();
  for (const item of hypothesesWithChanges) {
    if (!item.change || item.change.alreadyApplied) continue;
    if (usedFiles.has(item.change.filePath)) continue;
    selected.push(item);
    usedFiles.add(item.change.filePath);
    if (selected.length >= maxBatch) break;
  }
  return selected;
}

async function runBatch(hypotheses) {
  const withChanges = hypotheses.map(h => ({ hypothesis: h, change: ChangeGenerator.generate(h) }));
  const batch = filterNonOverlapping(withChanges, 3);

  if (batch.length === 0) {
    return { success: false, note: 'no_actionable_hypothesis' };
  }

  log(`Batch runner: testing ${batch.length} experiments in parallel worktrees`);
  const running = batch.map(item => runExperimentInWorktree(item.hypothesis, item.change));
  const results = await Promise.all(running);

  for (let i = 0; i < results.length; i++) {
    const res = results[i];
    const item = batch[i];
    log(`Experiment ${item.hypothesis.title}: ${res.success ? 'PASS' : 'FAIL'}${res.error ? ' — ' + res.error : ''}`);
    cleanup(res.worktreePath);
  }

  const passed = results.filter((r, i) => r.success).map((r, i) => batch[i]);
  return {
    success: passed.length > 0,
    tested: batch.length,
    passed: passed.length,
    passedExperiments: passed.map(p => ({ title: p.hypothesis.title, filePath: p.change.filePath })),
    failedExperiments: results.filter(r => !r.success).map((r, i) => ({ title: batch[i].hypothesis.title, error: r.error }))
  };
}

module.exports = { runBatch };

if (require.main === module) {
  const HypothesisGenerator = require('./hypothesis_generator');
  const hypotheses = HypothesisGenerator.generate();
  runBatch(hypotheses).then(r => {
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.success ? 0 : 1);
  }).catch(e => {
    console.error('Batch runner failed:', e.message);
    process.exit(1);
  });
}

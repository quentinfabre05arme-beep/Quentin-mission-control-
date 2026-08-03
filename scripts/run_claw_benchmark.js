/**
 * CLAW BENCHMARK v1.1
 * Representative tasks to evaluate agent capability before/after changes.
 */

const fs = require('fs');
const path = require('path');

const BENCHMARK_PATH = path.join(__dirname, '..', 'project_claw_core', 'data', 'claw_benchmark_results.json');

function statusReporterCheck() {
  const srPath = path.join(__dirname, '..', 'project_claw_core', 'core', 'status_reporter.js');
  if (!fs.existsSync(srPath)) return false;
  const sr = require(srPath);
  const reporter = sr.StatusReporter ? new sr.StatusReporter() : null;
  if (!reporter) return false;
  const r = reporter.generate ? reporter.generate() : (reporter.run ? reporter.run() : null);
  return r && (r.success !== false);
}

const TASKS = [
  { id: 'research', name: 'Web research and synthesis', check: () => fs.existsSync('research/Self_Improving_AI_Agent_Deep_Research_2026.md') },
  { id: 'code', name: 'Write and syntax-check JS module', check: () => {
    const testFile = path.join(__dirname, '..', 'project_claw_core', 'core', 'capability_router.js');
    try { require('child_process').execSync(`node -c "${testFile}"`, { windowsHide: true }); return true; } catch(e){ return false; }
  }},
  { id: 'memory', name: 'Memory tier search returns results', check: () => {
    const m = require('../project_claw_core/core/memory_tier.js');
    const r = m.search('health');
    return Array.isArray(r) && r.length > 0;
  }},
  { id: 'verify', name: 'Capability verifier passes', check: () => {
    const summaryPath = 'project_claw_core/data/capability_verification_summary.json';
    if (!fs.existsSync(summaryPath)) return false;
    const s = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    return s.passed === s.total;
  }},
  { id: 'status', name: 'Status reporter runs', check: statusReporterCheck },
  { id: 'git', name: 'Git status readable', check: () => {
    try {
      require('child_process').execSync('git status --short', { cwd: path.join(__dirname, '..'), windowsHide: true });
      return true;
    } catch (e) { return false; }
  }}
];

function run() {
  const results = TASKS.map(t => {
    const start = Date.now();
    let passed = false;
    let error = null;
    try { passed = !!t.check(); } catch (e) { error = e.message; }
    return { id: t.id, name: t.name, passed, error, duration_ms: Date.now() - start };
  });

  const passed = results.filter(r => r.passed).length;
  const report = {
    timestamp: new Date().toISOString(),
    total: results.length,
    passed,
    failed: results.length - passed,
    score: passed / results.length,
    results
  };

  fs.mkdirSync(path.dirname(BENCHMARK_PATH), { recursive: true });
  fs.writeFileSync(BENCHMARK_PATH, JSON.stringify(report, null, 2));
  const historyPath = path.join(__dirname, '..', 'project_claw_core', 'data', 'claw_benchmark_history.jsonl');
  fs.appendFileSync(historyPath, JSON.stringify({ ...report, recorded_at: new Date().toISOString() }) + '\\n');
  return report;
}

module.exports = { run, TASKS };

if (require.main === module) {
  const report = run();
  console.log(`Claw Benchmark: ${report.passed}/${report.total} passed (${(report.score*100).toFixed(0)}%)`);
  for (const r of report.results) {
    console.log(`  ${r.passed ? '✅' : '❌'} ${r.name}${r.error ? ' — ' + r.error : ''}`);
  }
}

# Verify all new modules, run benchmark, and commit/push
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
Set-Location $repo

# 1. Syntax check all new JS modules
$modules = @(
  'project_claw_core/core/capability_router.js',
  'project_claw_core/core/capability_usage_tracker.js',
  'project_claw_core/core/capability_functional_tester.js',
  'project_claw_core/core/memory_tier.js',
  'project_claw_core/core/hierarchical_planner.js',
  'autonomous_improvement/core/experiment_guardian.js',
  'scripts/run_claw_benchmark.js'
)

foreach ($m in $modules) {
  node -c $m
  if ($LASTEXITCODE -ne 0) { throw "Syntax check failed: $m" }
}
Write-Host "✅ Syntax checks passed" -ForegroundColor Green

# 2. Run benchmark
node scripts/run_claw_benchmark.js
if ($LASTEXITCODE -ne 0) { throw "Benchmark failed" }

# 3. Run capability functional tests
node project_claw_core/core/capability_functional_tester.js
if ($LASTEXITCODE -ne 0) { throw "Functional tests failed" }

# 4. Quick router smoke test
node project_claw_core/core/capability_router.js "send status report"
if ($LASTEXITCODE -ne 0) { throw "Router smoke test failed" }

# 5. Git commit and push
git add -A
git commit -m "Add 2026 self-improvement research + capability router/tracker, memory tier, planner, benchmark, experiment guardian"
git push origin master

Write-Host "✅ Committed and pushed" -ForegroundColor Green

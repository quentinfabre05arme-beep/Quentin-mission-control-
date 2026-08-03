# Integration helper: wire new 2026 modules into existing orchestrators
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
Set-Location $repo

# Syntax check all new modules
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

Write-Host "All new modules syntax-checked OK" -ForegroundColor Green

# Optional: run benchmark
# node scripts/run_claw_benchmark.js

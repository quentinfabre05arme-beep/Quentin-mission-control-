# Run Claw benchmark and print summary
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
Set-Location $repo
node scripts/run_claw_benchmark.js

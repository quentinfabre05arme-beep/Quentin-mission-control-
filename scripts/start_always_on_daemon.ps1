# OpenClaw Always-On Daemon loop
# Restarts the daemon if it exits
$ErrorActionPreference = "Stop"
$workspace = "C:\Users\quent\.openclaw\workspace"
Set-Location $workspace

while ($true) {
  try {
    node alpha_fund_v3/core/always_on_daemon.js
  } catch {
    Write-Host "[AlwaysOn] Daemon exited: $_" -ForegroundColor Yellow
  }
  Write-Host "[AlwaysOn] Restarting in 30s..." -ForegroundColor Cyan
  Start-Sleep -Seconds 30
}

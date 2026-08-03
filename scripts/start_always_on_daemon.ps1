# OpenClaw Always-On Daemon loop
# Restarts the daemon if it exits, and ensures only one instance runs.
$ErrorActionPreference = "Stop"
$workspace = "C:\Users\quent\.openclaw\workspace"
Set-Location $workspace

function Stop-ExistingDaemon {
  Get-Process node -ErrorAction SilentlyContinue | Where-Object {
    (Get-WmiObject Win32_Process -Filter "ProcessId=$($_.Id)").CommandLine -like '*alpha_fund_v3/core/always_on_daemon.js*'
  } | Stop-Process -Force
}

while ($true) {
  Stop-ExistingDaemon
  try {
    node alpha_fund_v3/core/always_on_daemon.js
  } catch {
    Write-Host "[AlwaysOn] Daemon exited: $_" -ForegroundColor Yellow
  }
  Write-Host "[AlwaysOn] Restarting in 30s..." -ForegroundColor Cyan
  Start-Sleep -Seconds 30
}

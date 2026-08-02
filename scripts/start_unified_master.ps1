# Unified Master Orchestrator — continuous loop with auto-restart
$workspace = "C:\Users\quent\.openclaw\workspace"
$node = (Get-Command node).Source
$script = "$workspace\project_claw_core\core\unified_master_orchestrator.js"
$interval = 600000  # 10 minutes
$target = "8685343197"

while ($true) {
    Write-Host "[$(Get-Date)] Starting unified master loop..." -ForegroundColor Green
    & $node $script loop $interval $target
    $exit = $LASTEXITCODE
    Write-Host "[$(Get-Date)] Unified master exited with code $exit, restarting in 30s..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
}

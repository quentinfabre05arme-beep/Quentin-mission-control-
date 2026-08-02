# Autonomous Business Operation System — continuous loop with auto-restart
$workspace = "C:\Users\quent\.openclaw\workspace"
$node = (Get-Command node).Source
$script = "$workspace\autonomous_business\core\abos_orchestrator.js"
$interval = 3600000  # 1 hour
$target = "8685343197"

while ($true) {
    Write-Host "[$(Get-Date)] Starting ABOS cycle..." -ForegroundColor Green
    & $node $script loop $interval $target
    $exit = $LASTEXITCODE
    Write-Host "[$(Get-Date)] ABOS exited with code $exit, restarting in 60s..." -ForegroundColor Yellow
    Start-Sleep -Seconds 60
}

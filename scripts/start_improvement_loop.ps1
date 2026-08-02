# Autonomous Self-Improvement Loop
$workspace = "C:\Users\quent\.openclaw\workspace"
Set-Location $workspace

while ($true) {
    Write-Host "[$(Get-Date)] Running improvement cycle..."
    node autonomous_improvement/core/improvement_orchestrator.js once
    Write-Host "[$(Get-Date)] Cycle complete. Sleeping 30 min..."
    Start-Sleep -Seconds 1800
}

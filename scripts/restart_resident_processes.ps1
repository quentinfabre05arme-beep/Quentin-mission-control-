# Restart all resident OpenClaw processes so new code loads
param(
    [switch]$Verbose
)

$tasks = @(
    'OpenClaw-Always-On-Daemon',
    'OpenClaw-Unified-Master',
    'OpenClaw-ABOS',
    'OpenClaw-Autonomous-Improvement'
)

foreach ($t in $tasks) {
    Write-Host "Restarting $t..." -ForegroundColor Cyan
    schtasks /end /tn $t 2>$null | Out-Null
    Start-Sleep -Seconds 2
    $result = schtasks /run /tn $t 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ⚠️ Failed to start $t`: $result" -ForegroundColor Yellow
    } else {
        Write-Host "  ✅ $t restarted" -ForegroundColor Green
    }
}

Write-Host "`nAll resident processes restarted. Allow 10-30 seconds for loops to initialize." -ForegroundColor Cyan

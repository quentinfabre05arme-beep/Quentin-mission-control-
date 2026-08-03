# Run token monitor hourly
$workspace = "C:\Users\quent\.openclaw\workspace"
Set-Location $workspace

& node missions/token_monitor.js --json | Out-File -FilePath "project_claw_core/data/token_usage_latest.json" -Encoding utf8

# Optional: send alert if budget exceeded
$summary = Get-Content "project_claw_core/data/token_usage_latest.json" -Raw | ConvertFrom-Json
if ($summary.alert) {
    Write-EventLog -LogName Application -Source "OpenClaw" -EventId 1001 -EntryType Warning -Message $summary.alert -ErrorAction SilentlyContinue
}

# Archive old session files to free up space
# Moves files older than 7 days to archive folder

$sessionDir = "C:\Users\quent\.openclaw\agents\main\sessions"
$archiveDir = "C:\Users\quent\.openclaw\agents\main\sessions\archive"

# Create archive directory if it doesn't exist
if (!(Test-Path $archiveDir)) {
    New-Item -ItemType Directory -Path $archiveDir -Force | Out-Null
    Write-Host "Created archive directory" -ForegroundColor Green
}

$cutoffDate = (Get-Date).AddDays(-7)
$files = Get-ChildItem -Path $sessionDir -Filter "*.jsonl" | Where-Object { $_.LastWriteTime -lt $cutoffDate }

$moved = 0
$bytes = 0

foreach ($file in $files) {
    $targetPath = Join-Path $archiveDir $file.Name
    Move-Item -Path $file.FullName -Destination $targetPath -Force
    $moved++
    $bytes += $file.Length
}

$mb = [math]::Round($bytes / 1MB, 2)
Write-Host "Archived $moved files ($mb MB)" -ForegroundColor Green
Write-Host "Files older than $($cutoffDate.ToString('yyyy-MM-dd')) moved to archive" -ForegroundColor Cyan

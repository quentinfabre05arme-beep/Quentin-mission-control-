# X Post Scheduler - triggers x_post_simple.ps1 from Task Scheduler
param(
    [string]$TimeOfDay = "morning"
)

$ErrorActionPreference = "Stop"
$workspace = "C:\Users\quent\.openclaw\workspace"
Set-Location $workspace

$queueFile = Join-Path $workspace "x_queue.json"
$logFile = Join-Path $workspace "logs\x_posts.log"

function Write-Log($message) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $entry = "[$timestamp] $message"
    Write-Output $entry
    Add-Content -Path $logFile -Value $entry -ErrorAction SilentlyContinue
}

if (-not (Test-Path $queueFile)) {
    Write-Log "No queue file found. Exiting."
    exit 0
}

try {
    $queue = Get-Content $queueFile -Raw | ConvertFrom-Json
    $pending = $queue.posts | Where-Object { $_.status -eq "pending" }
    
    if (-not $pending) {
        Write-Log "No pending posts."
        exit 0
    }
    
    # Pick one post (first pending)
    $post = $pending | Select-Object -First 1
    Write-Log "Posting queued item: $($post.id)"
    
    & powershell.exe -ExecutionPolicy Bypass -File "$workspace\x_post_simple.ps1" -Text $post.text
    
    # Check metrics to see if post succeeded
    $metricsFile = "$workspace\logs\x_metrics.json"
    $lastMetric = $null
    if (Test-Path $metricsFile) {
        $metrics = Get-Content $metricsFile -Raw | ConvertFrom-Json
        $lastMetric = $metrics.posts | Sort-Object timestamp -Descending | Select-Object -First 1
    }
    
    # Mark as posted only if success
    if ($lastMetric -and $lastMetric.status -eq "success" -and $lastMetric.postId -eq $post.id) {
        $found = $queue.posts | Where-Object { $_.id -eq $post.id }
        if ($found) {
            $found.status = "posted"
            $found.postedAt = (Get-Date -Format "o")
            $queue | ConvertTo-Json -Depth 10 | Set-Content $queueFile
            Write-Log "Marked $($post.id) as posted."
        }
    } else {
        Write-Log "Post $($post.id) did not report success — left as pending for retry"
    }
} catch {
    Write-Log "Scheduler error: $($_.Exception.Message)"
    exit 1
}

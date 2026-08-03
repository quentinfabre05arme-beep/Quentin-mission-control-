# Unified Finance Manager - Daily run wrapper
$ErrorActionPreference = "Stop"
$workspace = "C:\Users\quent\.openclaw\workspace"
Set-Location $workspace

$logFile = "$workspace\missions\unified_finance_manager.log"

function Write-Log($message) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $entry = "[$timestamp] $message"
    Write-Output $entry
    Add-Content -Path $logFile -Value $entry -ErrorAction SilentlyContinue
}

Write-Log "=== Unified Finance Manager Daily Run Starting ==="

try {
    node missions/unified_finance_manager.js
    Write-Log "=== Unified Finance Manager Completed ==="
} catch {
    Write-Log "ERROR: $($_.Exception.Message)"
    exit 1
}

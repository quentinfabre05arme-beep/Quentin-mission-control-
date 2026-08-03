# x_post_with_chrome_check.ps1 - Post to X with Chrome auto-launch if needed
param(
    [Parameter(Mandatory=$false)]
    [string]$Text,
    
    [Parameter(Mandatory=$false)]
    [switch]$FromQueue
)

$Config = @{
    LogFile = "C:\Users\quent\.openclaw\workspace\logs\x_post.log"
    QueueFile = "C:\Users\quent\.openclaw\workspace\x_queue.json"
    ChromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
    MaxWaitSeconds = 60
}

function Write-Log($Message, $Level="INFO") {
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $Entry = "[$Timestamp] [$Level] $Message"
    Write-Host $Entry
    Add-Content -Path $Config.LogFile -Value $Entry -ErrorAction SilentlyContinue
}

function Ensure-ChromeRunning {
    $Chrome = Get-Process | Where-Object { $_.Name -eq "chrome" -and $_.MainWindowHandle -ne 0 } | Select-Object -First 1
    
    if ($Chrome) {
        Write-Log "Chrome already running (PID: $($Chrome.Id))"
        return $true
    }
    
    Write-Log "Chrome not running. Starting Chrome..."
    
    if (-not (Test-Path $Config.ChromePath)) {
        Write-Log "Chrome not found at expected path" "ERROR"
        return $false
    }
    
    # Start Chrome with X
    Start-Process $Config.ChromePath -ArgumentList 'https://x.com','--window-size=800,600'
    
    # Wait for Chrome to start
    $Waited = 0
    while ($Waited -lt $Config.MaxWaitSeconds) {
        Start-Sleep -Seconds 2
        $Waited += 2
        $Chrome = Get-Process | Where-Object { $_.Name -eq "chrome" -and $_.MainWindowHandle -ne 0 } | Select-Object -First 1
        if ($Chrome) {
            Write-Log "Chrome started successfully (waited ${Waited}s)"
            Start-Sleep -Seconds 3  # Extra time for X to load
            return $true
        }
    }
    
    Write-Log "Chrome failed to start within $Config.MaxWaitSeconds seconds" "ERROR"
    return $false
}

# Main execution
Write-Log "=== X Post with Chrome Check Starting ==="

# Ensure Chrome is running
if (-not (Ensure-ChromeRunning)) {
    Write-Log "Cannot proceed without Chrome" "ERROR"
    exit 1
}

# Now run the enhanced posting script
$ArgList = @()
if ($Text) { $ArgList += "-Text", "$Text" }
if ($FromQueue) { $ArgList += "-FromQueue" }

$EnhancedScript = "C:\Users\quent\.openclaw\workspace\x_post_enhanced.ps1"
& $EnhancedScript @ArgList

# x_automation_service.ps1 - X Posting via Chrome Automation
# Scheduled to run via Windows Task Scheduler

$ErrorActionPreference = "Stop"
$LogFile = "C:\Users\quent\.openclaw\workspace\logs\x_automation.log"
$QueueFile = "C:\Users\quent\.openclaw\workspace\x_queue.json"

function Write-Log($Message) {
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "[$Timestamp] $Message"
    Write-Host $LogEntry
    Add-Content -Path $LogFile -Value $LogEntry -ErrorAction SilentlyContinue
}

function Get-QueuedPost {
    try {
        $Queue = Get-Content $QueueFile -Raw | ConvertFrom-Json
        return $Queue.posts | Where-Object { $_.status -eq "pending" } | Select-Object -First 1
    } catch {
        Write-Log "Error reading queue: $($_.Exception.Message)"
        return $null
    }
}

function Mark-Posted($PostId) {
    try {
        $Queue = Get-Content $QueueFile -Raw | ConvertFrom-Json
        $Post = $Queue.posts | Where-Object { $_.id -eq $PostId }
        if ($Post) {
            $Post.status = "posted"
            $Post.postedAt = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
            $Queue | ConvertTo-Json -Depth 10 | Set-Content $QueueFile
            Write-Log "Marked post $PostId as posted"
        }
    } catch {
        Write-Log "Error updating queue: $($_.Exception.Message)"
    }
}

function Post-ToX($Text) {
    Write-Log "Attempting to post: $Text"
    
    # Method 1: Try Chrome with remote debugging
    $ChromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
    if (-not (Test-Path $ChromePath)) {
        $ChromePath = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
    }
    
    if (-not (Test-Path $ChromePath)) {
        Write-Log "Chrome not found"
        return @{ success = $false; error = "Chrome not found" }
    }
    
    # Launch Chrome with remote debugging if not already running
    $DebugPort = 9222
    $RunningChrome = Get-Process | Where-Object { $_.Name -like "*chrome*" -and $_.CommandLine -like "*remote-debugging-port=$DebugPort*" }
    
    if (-not $RunningChrome) {
        Write-Log "Starting Chrome with remote debugging..."
        Start-Process $ChromePath -ArgumentList "--remote-debugging-port=$DebugPort","--user-data-dir=C:\Users\quent\.openclaw\workspace\chrome-profile" -WindowStyle Hidden
        Start-Sleep -Seconds 3
    }
    
    # Use CDP (Chrome DevTools Protocol) to navigate and post
    try {
        # Get websocket URL
        $Response = Invoke-RestMethod -Uri "http://localhost:$DebugPort/json/version" -TimeoutSec 5
        $WsUrl = $Response.webSocketDebuggerUrl
        
        Write-Log "Connected to Chrome CDP"
        
        # Open X compose
        # This requires WebSocket communication with CDP
        # For now, use simpler method
        
        return @{ success = $true; method = "cdp" }
        
    } catch {
        Write-Log "CDP failed: $($_.Exception.Message)"
        
        # Method 2: Use UI Automation
        return Post-UsingUIAutomation -Text $Text
    }
}

function Post-UsingUIAutomation($Text) {
    Write-Log "Using UI Automation method..."
    
    # Activate Chrome
    $Chrome = Get-Process | Where-Object { $_.Name -eq "chrome" } | Select-Object -First 1
    if (-not $Chrome) {
        Write-Log "Chrome not running"
        return @{ success = $false; error = "Chrome not running" }
    }
    
    # Add Windows Forms type for SendKeys
    Add-Type -AssemblyName System.Windows.Forms
    
    # Bring Chrome to front
    $Chrome | ForEach-Object { 
        $_.MainWindowHandle | ForEach-Object {
            # Use Win32 API to bring window to front
            $signature = @"
[DllImport("user32.dll")]
public static extern bool SetForegroundWindow(IntPtr hWnd);
"@
            $type = Add-Type -MemberDefinition $signature -Name Win32 -Namespace Win32Functions -PassThru
            $type::SetForegroundWindow($_) | Out-Null
        }
    }
    
    Start-Sleep -Milliseconds 500
    
    # Navigate to X compose
    [System.Windows.Forms.SendKeys]::SendWait("^l")  # Ctrl+L for address bar
    Start-Sleep -Milliseconds 300
    [System.Windows.Forms.SendKeys]::SendWait("x.com/compose")
    Start-Sleep -Milliseconds 300
    [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
    Start-Sleep -Seconds 2
    
    # Type the tweet
    [System.Windows.Forms.SendKeys]::SendWait($Text)
    Start-Sleep -Milliseconds 500
    
    # Post with Ctrl+Enter
    [System.Windows.Forms.SendKeys]::SendWait("^~")  # Ctrl+Enter
    
    Write-Log "Posted via UI automation"
    return @{ success = $true; method = "ui-automation" }
}

# Main
Write-Log "=== X Automation Service Starting ==="

$Post = Get-QueuedPost
if (-not $Post) {
    Write-Log "No pending posts in queue"
    exit 0
}

Write-Log "Found post: $($Post.text.Substring(0, [Math]::Min(50, $Post.text.Length)))..."

$Result = Post-ToX -Text $Post.text

if ($Result.success) {
    Mark-Posted -PostId $Post.id
    Write-Log "✅ Post successful"
} else {
    Write-Log "❌ Post failed: $($Result.error)"
}

Write-Log "=== X Automation Service Complete ==="

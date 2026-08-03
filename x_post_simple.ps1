# x_post_simple.ps1 - Free X Posting via Windows Automation
# Requires Chrome to be logged into X already

param(
    [string]$Text = ""
)

$logFile = "C:\Users\quent\.openclaw\workspace\logs\x_posts.log"
$metricsFile = "C:\Users\quent\.openclaw\workspace\logs\x_metrics.json"
$screenshotDir = "C:\Users\quent\.openclaw\workspace\screenshots"
$queueFile = "C:\Users\quent\.openclaw\workspace\x_queue.json"

function Write-Log($message) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $message"
    Write-Output $logEntry
    Add-Content -Path $logFile -Value $logEntry -ErrorAction SilentlyContinue
}

function Write-Metric($status, $postId, $error) {
    try {
        $metrics = @{ posts = @() }
        if (Test-Path $metricsFile) {
            $metrics = Get-Content $metricsFile -Raw | ConvertFrom-Json
            if (-not $metrics.posts) { $metrics.posts = @() }
        }
        $metrics.posts += @{
            timestamp = (Get-Date -Format "o")
            status = $status
            postId = $postId
            error = $error
        }
        $metrics | ConvertTo-Json -Depth 5 | Set-Content $metricsFile
    } catch {
        Write-Log "Metrics error: $($_.Exception.Message)"
    }
}

# Ensure directories exist
New-Item -ItemType Directory -Path (Split-Path $logFile) -Force -ErrorAction SilentlyContinue | Out-Null
New-Item -ItemType Directory -Path $screenshotDir -Force -ErrorAction SilentlyContinue | Out-Null

Write-Log "=== X Simple Poster Starting ==="

# If no text provided, try to get from queue
$postId = $null
if ([string]::IsNullOrWhiteSpace($Text)) {
    try {
        $queue = Get-Content $queueFile -Raw | ConvertFrom-Json
        $pendingPost = $queue.posts | Where-Object { $_.status -eq "pending" } | Select-Object -First 1
        if ($pendingPost) {
            $Text = $pendingPost.text
            $postId = $pendingPost.id
            Write-Log "Found queued post: $postId"
        }
    } catch {
        Write-Log "Could not read queue file: $($_.Exception.Message)"
    }
}

if ([string]::IsNullOrWhiteSpace($Text)) {
    Write-Log "No text provided and no pending posts found. Exiting."
    Write-Metric "skipped" $null "no text or pending posts"
    exit 0
}

Write-Log "Posting text: $($Text.Substring(0, [Math]::Min(50, $Text.Length)))..."

# Load required assemblies
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
    using System;
    using System.Runtime.InteropServices;
    public class WinAPI {
        [DllImport("user32.dll")]
        public static extern bool SetForegroundWindow(IntPtr hWnd);
        [DllImport("user32.dll")]
        public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
        [DllImport("user32.dll")]
        public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);
        public const int SW_RESTORE = 9;
        public const byte VK_CONTROL = 0x11;
        public const byte VK_T = 0x54;
        public const byte VK_RETURN = 0x0D;
        public const uint KEYEVENTF_KEYUP = 0x0002;
    }
"@

# Check if Chrome is running
$chromeRunning = Get-Process chrome -ErrorAction SilentlyContinue
if (-not $chromeRunning) {
    Write-Log "Starting Chrome..."
    Start-Process "chrome.exe" "https://x.com/home" -WindowStyle Normal
    Start-Sleep -Seconds 8
}

# Find Chrome window
$chrome = Get-Process chrome | Where-Object { $_.MainWindowTitle -like "*X*" -or $_.MainWindowTitle -like "*Twitter*" -or $_.MainWindowTitle -like "*Chrome*" } | Select-Object -First 1

if (-not $chrome) {
    Write-Log "Chrome window not found - opening X compose..."
    Start-Process "chrome.exe" "https://x.com/compose/tweet" -WindowStyle Normal
    Start-Sleep -Seconds 5
    $chrome = Get-Process chrome | Where-Object { $_.MainWindowTitle } | Select-Object -First 1
}

if ($chrome) {
    try {
        Write-Log "Found Chrome window: $($chrome.MainWindowTitle)"
        
        # Bring Chrome to foreground
        [WinAPI]::ShowWindow($chrome.MainWindowHandle, [WinAPI]::SW_RESTORE) | Out-Null
        Start-Sleep -Milliseconds 300
        [WinAPI]::SetForegroundWindow($chrome.MainWindowHandle) | Out-Null
        Start-Sleep -Milliseconds 500
        
        # Open new tab with compose URL
        Write-Log "Opening compose tab..."
        [WinAPI]::keybd_event([WinAPI]::VK_CONTROL, 0, 0, 0)
        [WinAPI]::keybd_event([WinAPI]::VK_T, 0, 0, 0)
        [WinAPI]::keybd_event([WinAPI]::VK_T, 0, [WinAPI]::KEYEVENTF_KEYUP, 0)
        [WinAPI]::keybd_event([WinAPI]::VK_CONTROL, 0, [WinAPI]::KEYEVENTF_KEYUP, 0)
        Start-Sleep -Milliseconds 800
        
        # Type compose URL
        [System.Windows.Forms.SendKeys]::SendWait("https://x.com/compose/tweet")
        Start-Sleep -Milliseconds 300
        [WinAPI]::keybd_event([WinAPI]::VK_RETURN, 0, 0, 0)
        [WinAPI]::keybd_event([WinAPI]::VK_RETURN, 0, [WinAPI]::KEYEVENTF_KEYUP, 0)
        Start-Sleep -Seconds 3
        
        # Type the tweet text
        Write-Log "Typing tweet text..."
        [System.Windows.Forms.SendKeys]::SendWait($Text)
        Start-Sleep -Milliseconds 500
        
        # Send Ctrl+Enter to post
        Write-Log "Submitting post..."
        [WinAPI]::keybd_event([WinAPI]::VK_CONTROL, 0, 0, 0)
        [WinAPI]::keybd_event([WinAPI]::VK_RETURN, 0, 0, 0)
        [WinAPI]::keybd_event([WinAPI]::VK_RETURN, 0, [WinAPI]::KEYEVENTF_KEYUP, 0)
        [WinAPI]::keybd_event([WinAPI]::VK_CONTROL, 0, [WinAPI]::KEYEVENTF_KEYUP, 0)
        
        Start-Sleep -Seconds 2
        
        Write-Log "✅ Post submitted"
        Write-Metric "success" $postId $null
    } catch {
        Write-Log "❌ Post failed: $($_.Exception.Message)"
        Write-Metric "failed" $postId $_.Exception.Message
    }
} else {
    Write-Log "❌ Could not find or start Chrome"
    Write-Metric "failed" $postId "chrome not found"
}

Write-Log "=== X Simple Poster Complete ==="

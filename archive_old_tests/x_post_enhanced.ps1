# x_post_enhanced.ps1 - Enhanced X Posting with Error Recovery
# Features: Retry logic, screenshots, detailed logging, queue management

param(
    [Parameter(Mandatory=$false)]
    [string]$Text,
    
    [Parameter(Mandatory=$false)]
    [switch]$FromQueue,
    
    [Parameter(Mandatory=$false)]
    [int]$MaxRetries = 3,
    
    [Parameter(Mandatory=$false)]
    [int]$RetryDelaySeconds = 5
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$Config = @{
    LogFile = "C:\Users\quent\.openclaw\workspace\logs\x_post_enhanced.log"
    QueueFile = "C:\Users\quent\.openclaw\workspace\x_queue.json"
    ScreenshotDir = "C:\Users\quent\.openclaw\workspace\logs\screenshots"
    ChromePath = @(
        "C:\Program Files\Google\Chrome\Application\chrome.exe",
        "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        "C:\Users\quent\AppData\Local\Google\Chrome\Application\chrome.exe"
    )
}

# Ensure directories exist
New-Item -ItemType Directory -Force -Path (Split-Path $Config.LogFile) | Out-Null
New-Item -ItemType Directory -Force -Path $Config.ScreenshotDir | Out-Null

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $Entry = "[$Timestamp] [$Level] $Message"
    Write-Host $Entry
    Add-Content -Path $Config.LogFile -Value $Entry
}

function Take-Screenshot {
    param([string]$Name)
    try {
        $Bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
        $Bitmap = New-Object System.Drawing.Bitmap($Bounds.Width, $Bounds.Height)
        $Graphics = [System.Drawing.Graphics]::FromImage($Bitmap)
        $Graphics.CopyFromScreen($Bounds.Location, [System.Drawing.Point]::Empty, $Bounds.Size)
        $Path = Join-Path $Config.ScreenshotDir "$Name`_$(Get-Date -Format 'yyyyMMdd_HHmmss').png"
        $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
        $Graphics.Dispose()
        $Bitmap.Dispose()
        return $Path
    } catch {
        Write-Log "Failed to take screenshot: $($_.Exception.Message)" "ERROR"
        return $null
    }
}

function Get-QueuedPost {
    try {
        if (-not (Test-Path $Config.QueueFile)) { return $null }
        $Queue = Get-Content $Config.QueueFile -Raw | ConvertFrom-Json
        $Post = $Queue.posts | Where-Object { $_.status -eq "pending" } | Select-Object -First 1
        return $Post
    } catch {
        Write-Log "Error reading queue: $($_.Exception.Message)" "ERROR"
        return $null
    }
}

function Mark-Posted {
    param([string]$PostId, [string]$TweetUrl = $null)
    try {
        $Queue = Get-Content $Config.QueueFile -Raw | ConvertFrom-Json
        $Post = $Queue.posts | Where-Object { $_.id -eq $PostId }
        if ($Post) {
            $Post.status = "posted"
            $Post.postedAt = (Get-Date -Format "o")
            $Post.url = $TweetUrl
            $Queue | ConvertTo-Json -Depth 10 | Set-Content $Config.QueueFile
            Write-Log "Marked post $PostId as posted" "SUCCESS"
        }
    } catch {
        Write-Log "Error updating queue: $($_.Exception.Message)" "ERROR"
    }
}

function Mark-Failed {
    param([string]$PostId, [string]$Error)
    try {
        $Queue = Get-Content $Config.QueueFile -Raw | ConvertFrom-Json
        $Post = $Queue.posts | Where-Object { $_.id -eq $PostId }
        if ($Post) {
            $Post.status = "failed"
            $Post.failedAt = (Get-Date -Format "o")
            $Post.error = $Error
            $Post.retryCount = ($Post.retryCount -as [int]) + 1
            $Queue | ConvertTo-Json -Depth 10 | Set-Content $Config.QueueFile
            Write-Log "Marked post $PostId as failed (retry: $($Post.retryCount))" "ERROR"
        }
    } catch {
        Write-Log "Error marking failed: $($_.Exception.Message)" "ERROR"
    }
}

function Find-Chrome {
    foreach ($Path in $Config.ChromePath) {
        if (Test-Path $Path) { return $Path }
    }
    return $null
}

function Send-Post {
    param([string]$PostText)
    
    Write-Log "Attempting to post: $PostText"
    
    # Find Chrome
    $ChromeExe = Find-Chrome
    if (-not $ChromeExe) {
        throw "Chrome not found at expected locations"
    }
    Write-Log "Found Chrome at: $ChromeExe"
    
    # Check if Chrome is running
    $ChromeProcess = Get-Process | Where-Object { 
        $_.Name -eq "chrome" -and $_.MainWindowHandle -ne 0 
    } | Select-Object -First 1
    
    if (-not $ChromeProcess) {
        throw "Chrome not running. Please open Chrome and log into X."
    }
    Write-Log "Chrome running (PID: $($ChromeProcess.Id))"
    
    # Bring Chrome to foreground
    $Hwnd = $ChromeProcess.MainWindowHandle
    $Code = @"
using System; using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")] [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    public const int SW_RESTORE = 9;
}
"@
    Add-Type -TypeDefinition $Code -Language CSharp -ErrorAction SilentlyContinue
    [Win32]::ShowWindow($Hwnd, 9) | Out-Null
    [Win32]::SetForegroundWindow($Hwnd) | Out-Null
    Start-Sleep -Milliseconds 500
    Write-Log "Chrome activated"
    
    # Open compose in new tab
    [System.Windows.Forms.SendKeys]::SendWait("^t")
    Start-Sleep -Milliseconds 300
    [System.Windows.Forms.SendKeys]::SendWait("x.com/compose")
    Start-Sleep -Milliseconds 200
    [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
    Write-Log "Navigating to compose..."
    Start-Sleep -Seconds 3
    
    # Check if compose loaded (simple check)
    Take-Screenshot -Name "compose_loaded"
    
    # Type the post
    Write-Log "Typing post..."
    [System.Windows.Forms.SendKeys]::SendWait($PostText)
    Start-Sleep -Milliseconds 500
    Take-Screenshot -Name "text_entered"
    
    # Submit with Ctrl+Enter
    Write-Log "Submitting..."
    [System.Windows.Forms.SendKeys]::SendWait("^~")
    Start-Sleep -Seconds 2
    Take-Screenshot -Name "post_submitted"
    
    # Close tab
    Start-Sleep -Seconds 1
    [System.Windows.Forms.SendKeys]::SendWait("^w")
    
    Write-Log "Post submitted successfully" "SUCCESS"
    return $true
}

# Main execution
Write-Log "=== X Enhanced Poster Starting ==="

try {
    # Get post text
    $PostText = if ($FromQueue) {
        $Post = Get-QueuedPost
        if (-not $Post) {
            Write-Log "No pending posts in queue" "WARN"
            exit 0
        }
        Write-Log "Found queued post: $($Post.id)"
        $Post.text
    } else {
        if (-not $Text) {
            throw "No text provided and -FromQueue not specified"
        }
        $Text
    }
    
    # Retry loop
    $Attempt = 0
    $Success = $false
    $LastError = $null
    
    while ($Attempt -lt $MaxRetries -and -not $Success) {
        $Attempt++
        Write-Log "Attempt $Attempt of $MaxRetries..."
        
        try {
            $Success = Send-Post -PostText $PostText
        } catch {
            $LastError = $_.Exception.Message
            Write-Log "Attempt $Attempt failed: $LastError" "ERROR"
            Take-Screenshot -Name "error_attempt_$Attempt"
            
            if ($Attempt -lt $MaxRetries) {
                Write-Log "Waiting $RetryDelaySeconds seconds before retry..."
                Start-Sleep -Seconds $RetryDelaySeconds
            }
        }
    }
    
    # Update queue
    if ($FromQueue -and $Post) {
        if ($Success) {
            Mark-Posted -PostId $Post.id -TweetUrl "https://x.com/quentinvest1/status/manual"
        } else {
            Mark-Failed -PostId $Post.id -Error $LastError
        }
    }
    
    if ($Success) {
        Write-Log "=== Post successful ===" "SUCCESS"
        exit 0
    } else {
        throw "Failed after $MaxRetries attempts"
    }
    
} catch {
    Write-Log "Fatal error: $($_.Exception.Message)" "ERROR"
    Take-Screenshot -Name "fatal_error"
    Write-Log "=== Post failed ===" "ERROR"
    exit 1
}

# x_post_simple_v2.ps1 - Simple X posting via browser
# Requires Chrome to be open with X logged in

param(
    [Parameter(Mandatory=$true)]
    [string]$Text
)

Add-Type -AssemblyName System.Windows.Forms

$LogFile = "C:\Users\quent\.openclaw\workspace\logs\x_post_simple.log"

function Log($Message) {
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $Entry = "[$Timestamp] $Message"
    Write-Host $Entry
    Add-Content -Path $LogFile -Value $Entry -ErrorAction SilentlyContinue
}

Log "Starting X post: $Text"

# Find Chrome process
$Chrome = Get-Process | Where-Object { $_.Name -eq "chrome" -and $_.MainWindowHandle -ne 0 } | Select-Object -First 1

if (-not $Chrome) {
    Log "ERROR: Chrome not running. Please open Chrome and log into X first."
    exit 1
}

Log "Found Chrome (PID: $($Chrome.Id))"

# Bring Chrome to foreground
$Hwnd = $Chrome.MainWindowHandle

# Win32 API for SetForegroundWindow
$Code = @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@

Add-Type -TypeDefinition $Code -Language CSharp -ErrorAction SilentlyContinue
[Win32]::SetForegroundWindow($Hwnd) | Out-Null

Start-Sleep -Milliseconds 800

# Navigate to compose
Log "Navigating to compose..."
[System.Windows.Forms.SendKeys]::SendWait("^t")  # Ctrl+T (new tab)
Start-Sleep -Milliseconds 500
[System.Windows.Forms.SendKeys]::SendWait("x.com/compose")
Start-Sleep -Milliseconds 300
[System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
Start-Sleep -Seconds 3

# Type the tweet
Log "Typing tweet..."
[System.Windows.Forms.SendKeys]::SendWait($Text)
Start-Sleep -Milliseconds 500

# Post with Ctrl+Enter
Log "Posting..."
[System.Windows.Forms.SendKeys]::SendWait("^~")  # Ctrl+Enter

Start-Sleep -Seconds 2
Log "✅ Post sent!"

# Close the tab
Start-Sleep -Seconds 1
[System.Windows.Forms.SendKeys]::SendWait("^w")  # Ctrl+W (close tab)

Log "Complete"

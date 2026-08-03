# x_post_v2.ps1 - Improved X posting with explicit button activation
param(
    [Parameter(Mandatory=$false)]
    [string]$Text,
    
    [Parameter(Mandatory=$false)]
    [switch]$FromQueue
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$Config = @{
    LogFile = "C:\Users\quent\.openclaw\workspace\logs\x_post_v2.log"
    ScreenshotDir = "C:\Users\quent\.openclaw\workspace\logs\screenshots"
}

function Log($msg) {
    $ts = Get-Date -Format "HH:mm:ss"
    $line = "[$ts] $msg"
    Write-Host $line
    Add-Content $Config.LogFile $line -ErrorAction SilentlyContinue
}

function Screenshot($name) {
    try {
        $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
        $bmp = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
        $path = "$($Config.ScreenshotDir)\${name}_$(Get-Date -Format 'HHmmss').png"
        $bmp.Save($path)
        $g.Dispose(); $bmp.Dispose()
        return $path
    } catch { return $null }
}

Log "=== X Post v2 Starting ==="

# Get text
if ($FromQueue) {
    $queue = Get-Content "C:\Users\quent\.openclaw\workspace\x_queue.json" -Raw | ConvertFrom-Json
    $post = $queue.posts | Where-Object { $_.status -eq "pending" } | Select-Object -First 1
    if (-not $post) { Log "No pending posts"; exit 0 }
    $Text = $post.text
    Log "From queue: $($post.id)"
} elseif (-not $Text) {
    Log "No text provided"; exit 1
}

# Ensure Chrome running
$chrome = Get-Process | Where-Object { $_.Name -eq "chrome" -and $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $chrome) {
    Log "Starting Chrome..."
    Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" "https://x.com"
    Start-Sleep -Seconds 8
    $chrome = Get-Process | Where-Object { $_.Name -eq "chrome" -and $_.MainWindowHandle -ne 0 } | Select-Object -First 1
}

if (-not $chrome) { Log "Chrome failed to start"; exit 1 }
Log "Chrome ready (PID: $($chrome.Id))"

# Bring to front
$hwnd = $chrome.MainWindowHandle
$code = @"
using System; using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")] [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    public const int SW_RESTORE = 9;
}
"@
Add-Type -TypeDefinition $code -Language CSharp -ErrorAction SilentlyContinue
[Win32]::ShowWindow($hwnd, 9) | Out-Null
[Win32]::SetForegroundWindow($hwnd) | Out-Null
Start-Sleep -Milliseconds 500

# Open compose - use 'n' hotkey for new post
Log "Opening compose..."
[System.Windows.Forms.SendKeys]::SendWait("n")
Start-Sleep -Seconds 2
Screenshot "compose_opened"

# Click in text area (rough center of screen where compose appears)
Log "Clicking text area..."
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$centerX = $screen.Width / 2
$centerY = $screen.Height / 3
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($centerX, $centerY)
Start-Sleep -Milliseconds 200

# Mouse click
Add-Type -MemberDefinition @"
[DllImport("user32.dll", CharSet=CharSet.Auto, CallingConvention=CallingConvention.StdCall)]
public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint cButtons, uint dwExtraInfo);
"@ -Name "Win32Mouse" -Namespace Win32Functions

[Win32Functions.Win32Mouse]::mouse_event(0x00000002, 0, 0, 0, 0) # Left down
[Win32Functions.Win32Mouse]::mouse_event(0x00000004, 0, 0, 0, 0) # Left up
Start-Sleep -Milliseconds 300

# Type the text
Log "Typing: $Text"
[System.Windows.Forms.SendKeys]::SendWait($Text)
Start-Sleep -Milliseconds 500
Screenshot "text_typed"

# Now look for Post button - Tab to it or use Ctrl+Enter
Log "Submitting..."
[System.Windows.Forms.SendKeys]::SendWait("{TAB}{TAB}{ENTER}")  # Tab to Post button, press Enter
Start-Sleep -Seconds 2
Screenshot "submitted"

Log "=== Post attempt complete ==="

# Update queue status
if ($FromQueue -and $post) {
    $queue = Get-Content "C:\Users\quent\.openclaw\workspace\x_queue.json" -Raw | ConvertFrom-Json
    $p = $queue.posts | Where-Object { $_.id -eq $post.id }
    if ($p) {
        $p.status = "attempted"
        $p.attemptedAt = Get-Date -Format "o"
        $queue | ConvertTo-Json -Depth 10 | Set-Content "C:\Users\quent\.openclaw\workspace\x_queue.json"
    }
}

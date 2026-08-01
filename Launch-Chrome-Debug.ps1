# Chrome with Remote Debugging - Auto-Launch Script
# Save this as a .ps1 file or create a Windows shortcut

$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$debugPort = 9222

# Check if Chrome is already running
$chromeProcess = Get-Process chrome -ErrorAction SilentlyCapture

if ($chromeProcess) {
    Write-Host "⚠️  Chrome is already running. Close it first to enable remote debugging."
    Write-Host "   Your tabs will be restored if you have 'Continue where you left off' enabled."
    exit 1
}

# Launch Chrome with remote debugging
Write-Host "🚀 Launching Chrome with remote debugging on port $debugPort..."
Start-Process $chromePath -ArgumentList "--remote-debugging-port=$debugPort"

Write-Host "✅ Chrome launched. Remote debugging enabled on port $debugPort"
Write-Host "📱 OpenClaw can now attach to your Chrome session."

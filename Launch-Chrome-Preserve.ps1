# Chrome Remote Debugging - Preserve Session
# This script closes Chrome gracefully and relaunches with debugging

Write-Host "🚀 Chrome Remote Debug Launcher (Preserve Session)"
Write-Host "===================================================="
Write-Host ""

# Check if Chrome is running
$chrome = Get-Process chrome -ErrorAction SilentlyContinue
if ($chrome) {
    Write-Host "Chrome is currently running. Closing gracefully..."
    Stop-Process -Name chrome -Force
    Start-Sleep -Seconds 3
}

# Launch Chrome with remote debugging + restore session
$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$arguments = "--remote-debugging-port=9222 --restore-last-session"

Write-Host "Launching Chrome with remote debugging on port 9222..."
Write-Host "Your previous tabs will be restored automatically."
Write-Host ""

Start-Process $chromePath -ArgumentList $arguments

Start-Sleep -Seconds 5

# Verify
$test = Test-NetConnection -ComputerName localhost -Port 9222 -WarningAction SilentlyContinue
if ($test.TcpTestSucceeded) {
    Write-Host "✅ Chrome launched successfully with remote debugging!"
    Write-Host "📡 Debug port: 9222"
    Write-Host ""
    Write-Host "Tell Claw: 'Chrome is ready'"
} else {
    Write-Host "⚠️  Could not verify debug port. Chrome may need more time to start."
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

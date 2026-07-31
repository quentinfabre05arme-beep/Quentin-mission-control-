# Start Chrome with remote debugging enabled
$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$debugPort = "9222"
$userDataDir = "$env:USERPROFILE\AppData\Local\Google\Chrome\User Data"

Write-Host "🚀 Starting Chrome with remote debugging on port $debugPort..." -ForegroundColor Cyan
Write-Host ""

# Kill existing Chrome processes
Write-Host "Step 1: Closing existing Chrome..." -ForegroundColor Yellow
Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Start Chrome with remote debugging
Write-Host "Step 2: Starting Chrome with remote debugging..." -ForegroundColor Yellow
& $chromePath --remote-debugging-port=$debugPort --user-data-dir="$userDataDir" --restore-last-session

Write-Host ""
Write-Host "✅ Chrome started with remote debugging!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Go to https://grok.com" -ForegroundColor White
Write-Host "  2. Login with your Google account (quentinvest1)" -ForegroundColor White
Write-Host "  3. Tell me 'done' and I'll take over navigation" -ForegroundColor White
Write-Host ""
Write-Host "⚠️ IMPORTANT: Keep Chrome open!" -ForegroundColor Red

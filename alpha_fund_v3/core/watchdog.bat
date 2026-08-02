@echo off
:: 🤖 CLAW WATCHDOG — Windows Service Monitor
:: Restarts OpenClaw gateway if crashed or frozen
:: Run as: Watchdog.bat (or schedule via Task Scheduler)

echo 🤖 CLAW WATCHDOG — Starting...
echo Check interval: 60 seconds
echo.

:loop
:: Check if OpenClaw gateway is running
powershell -Command "
$process = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*openclaw.mjs*' };
if (-not $process) {
    Write-Host '🚨 OpenClaw gateway NOT RUNNING!' -ForegroundColor Red;
    Write-Host '⏳ Attempting restart...' -ForegroundColor Yellow;
    
    # Kill any zombie node processes
    Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force;
    Start-Sleep 2;
    
    # Restart gateway
    Start-Process node -ArgumentList 'C:\Users\quent\AppData\Roaming\npm\node_modules\openclaw\openclaw.mjs gateway' -WindowStyle Hidden;
    
    # Log
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss';
    \"$timestamp WATCHDOG: Gateway restarted after crash\" | Out-File -Append -FilePath 'C:\Users\quent\.openclaw\workspace\logs\watchdog.log';
    
    Write-Host '✅ Gateway restarted!' -ForegroundColor Green;
} else {
    $mem = [math]::Round($process.WorkingSet64 / 1MB, 1);
    if ($mem -gt 1000) {
        Write-Host \"⚠️ Gateway RAM high: ${mem}MB\" -ForegroundColor Yellow;
    }
}
"

timeout /t 60 /nobreak >nul
goto loop

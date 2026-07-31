@echo off
REM Gateway Guardian Watchdog
REM Checks OpenClaw gateway every 2 minutes, restarts if down

echo [%date% %time%] Gateway Guardian check started...

REM Check if gateway port is responding
timeout /t 2 /nobreak >nul
echo [%date% %time%] Port check: 18789

REM Try to connect to gateway port
powershell -Command "try { $client = New-Object System.Net.Sockets.TcpClient; $client.Connect('localhost', 18789); $client.Close(); exit 0 } catch { exit 1 }"

if %ERRORLEVEL% NEQ 0 (
    echo [%date% %time%] Gateway DOWN detected! Attempting restart...
    
    REM Kill any existing node processes
    taskkill /F /IM node.exe 2>nul
    timeout /t 3 /nobreak >nul
    
    REM Try to restart gateway
    start /B openclaw gateway start 2>nul
    
    timeout /t 10 /nobreak >nul
    
    REM Verify restart
    powershell -Command "try { $client = New-Object System.Net.Sockets.TcpClient; $client.Connect('localhost', 18789); $client.Close(); exit 0 } catch { exit 1 }"
    
    if %ERRORLEVEL% EQU 0 (
        echo [%date% %time%] Gateway restarted successfully!
    ) else (
        echo [%date% %time%] Gateway restart FAILED!
    )
) else (
    echo [%date% %time%] Gateway healthy
)

echo [%date% %time%] Guardian check complete
@echo off
REM Claw Recovery Agent - Windows Task Scheduler Wrapper
REM Ensures Claw never stops operating

echo [%date% %time%] Starting Claw Recovery Agent...

REM Check if OpenClaw is running
tasklist /FI "IMAGENAME eq openclaw*" 2>nul | find /I /N "openclaw">nul
if "%ERRORLEVEL%"=="0" (
    echo [%date% %time%] OpenClaw is running
) else (
    echo [%date% %time%] OpenClaw NOT running - attempting restart...
    start /B openclaw gateway start
    timeout /t 10 /nobreak >nul
    
    REM Verify restart
    tasklist /FI "IMAGENAME eq openclaw*" 2>nul | find /I /N "openclaw">nul
    if "%ERRORLEVEL%"=="0" (
        echo [%date% %time%] OpenClaw restarted successfully
    ) else (
        echo [%date% %time%] FAILED to restart OpenClaw
    )
)

REM Run PowerShell health check
powershell.exe -ExecutionPolicy Bypass -File "C:\Users\quent\.openclaw\workspace\recovery\auto_restart.ps1" -Check

echo [%date% %time%] Recovery check complete
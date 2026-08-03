@echo off
echo === AUTONOMOUS REVENUE ENGINE — SCHEDULER ===
echo Setting up all scheduled tasks...
echo.

REM Alpha Signals — Daily at 08:00
schtasks /create /tn "AlphaFund-Signals-Daily" /tr "powershell.exe -File C:\Users\quent\.openclaw\workspace\missions\alpha_signals\runner.ps1 -Command daily" /sc daily /st 08:00 /f

REM Newsletter — Weekly on Sunday at 08:00
schtasks /create /tn "AlphaFund-Newsletter-Weekly" /tr "node C:\Users\quent\.openclaw\workspace\content_pipeline\newsletter\weekly_scheduler.js" /sc weekly /d SUN /st 08:00 /f

REM X Posting — 3x daily at 08:00, 14:00, 19:00
schtasks /create /tn "X-Post-Morning" /tr "node C:\Users\quent\.openclaw\workspace\content_pipeline\x_autonomous.js" /sc daily /st 08:00 /f
schtasks /create /tn "X-Post-Afternoon" /tr "node C:\Users\quent\.openclaw\workspace\content_pipeline\x_autonomous.js" /sc daily /st 14:00 /f
schtasks /create /tn "X-Post-Evening" /tr "node C:\Users\quent\.openclaw\workspace\content_pipeline\x_autonomous.js" /sc daily /st 19:00 /f

REM POD Daily Monitor — Daily at 09:00
schtasks /create /tn "POD-Daily-Monitor" /tr "C:\Users\quent\.openclaw\workspace\pod_business\daily_monitor.bat" /sc daily /st 09:00 /f

REM Autonomy Core Cycle — Every 6 hours
schtasks /create /tn "Autonomy-Core-Cycle" /tr "node C:\Users\quent\.openclaw\workspace\missions\autonomy_core_v2\autonomy_core.js" /sc hourly /mo 6 /f

echo.
echo === ALL TASKS SCHEDULED ===
echo.
schtasks /query /fo table | findstr "AlphaFund\|X-Post\|POD\|Autonomy"
echo.
pause
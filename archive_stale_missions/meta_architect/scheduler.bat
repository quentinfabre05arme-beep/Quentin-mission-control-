@echo off
echo === Scheduling Meta Architect ===

REM Run Meta Architect every hour
schtasks /create /tn "Meta-Architect-Hourly" /tr "node C:\Users\quent\.openclaw\workspace\missions\meta_architect\architect.js" /sc hourly /mo 1 /f

echo.
echo Meta Architect scheduled to run every hour.
echo Dashboard will be updated at: missions/meta_architect/dashboard.html
echo.
pause
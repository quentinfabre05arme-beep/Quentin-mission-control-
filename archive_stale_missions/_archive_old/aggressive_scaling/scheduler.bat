@echo off
echo === Scheduling Aggressive Scaling Tracker ===

REM Daily tracker run
schtasks /create /tn "Aggressive-Scaling-Daily" /tr "node C:\Users\quent\.openclaw\workspace\missions\aggressive_scaling\tracker.js" /sc daily /st 09:00 /f

echo.
echo Aggressive Scaling tracker scheduled for daily 09:00
echo.
pause
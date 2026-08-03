@echo off
REM Alpha Signals Bot - Daily Run Shortcut
cd /d "C:\Users\quent\.openclaw\workspace\missions\alpha_signals"
node bot.js daily %*
echo.
echo Press any key to exit...
pause > nul

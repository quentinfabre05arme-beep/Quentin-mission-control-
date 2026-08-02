@echo off
:: ALPHA FUND 15-Minute Research Loop Launcher
:: Keeps the loop running even if the process exits

echo Starting Alpha Fund 15-minute research loop...
echo Logs: alpha_fund_v3/logs/research_loop.log

:loop
node "%~dp0\..\scripts\research_loop_15min.js" %*
if %errorlevel% neq 0 (
  echo Process exited with code %errorlevel%, restarting in 30 seconds...
  timeout /t 30 /nobreak > nul
) else (
  timeout /t 60 /nobreak > nul
)
goto loop

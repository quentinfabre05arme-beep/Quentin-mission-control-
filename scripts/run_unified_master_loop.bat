@echo off
REM Unified Master Orchestrator — continuous loop with Telegram reports
cd /d C:\Users\quent\.openclaw\workspace
:start
node project_claw_core\core\unified_master_orchestrator.js loop 600000 8685343197
if %ERRORLEVEL% neq 0 (
  echo [%DATE% %TIME%] Unified master loop exited with error %ERRORLEVEL%, restarting in 30s...
  timeout /t 30 /nobreak > nul
  goto start
)

@echo off
setlocal

REM Easy way to test Microsoft connection via browser (no Azure registration needed)
REM Just double-click and sign into Outlook when Chrome opens

echo Starting Microsoft browser agent in visible mode...
echo Sign into your Microsoft account when Chrome opens.
echo.

node project_claw_core/agents/microsoft_browser_agent.js

pause

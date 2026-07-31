@echo off
REM Claw Auto-Start on Boot
timeout /t 30 /nobreak > nul
echo [%date% %time%] Starting Claw...
openclaw gateway start 2>nul
echo [%date% %time%] Done
call "C:\Users\quent\.openclaw\workspace\recovery\gateway_guardian.bat"

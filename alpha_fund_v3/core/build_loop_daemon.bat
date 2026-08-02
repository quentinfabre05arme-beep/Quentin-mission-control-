@echo off
:loop
timeout /t 3600 /nobreak > nul
node "C:\Users\quent\.openclaw\workspace\alpha_fund_v3\core\build_loop_continuous.js" > "C:\Users\quent\.openclaw\workspace\alpha_fund_v3\logs\build_loop_daemon.log" 2>&1
goto loop

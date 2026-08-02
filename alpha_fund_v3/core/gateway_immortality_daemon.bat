@echo off
:loop
timeout /t 30 /nobreak > nul
node "C:\Users\quent\.openclaw\workspace\alpha_fund_v3\core\gateway_immortality.js" > nul 2>&1
goto loop

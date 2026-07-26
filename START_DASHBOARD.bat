@echo off
echo ========================================
echo  🚀 QUENTIN'S LIVE DASHBOARD
echo ========================================
echo.

REM Check if Node.js is available
node --version > nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found! Please install Node.js first.
    pause
    exit /b 1
)

echo Starting dashboard server...
echo.

REM Start the server
cd /d "C:\Users\quent\.openclaw\workspace\lib"
start "Dashboard Server" node dashboard_server.js

echo.
echo ✅ Server starting...
timeout /t 2 /nobreak > nul

echo.
echo ========================================
echo  🌐 ACCESS YOUR DASHBOARD
echo ========================================
echo.
echo Local:     http://localhost:8080
echo.
echo To find your network IP:
echo   1. Open Command Prompt
echo   2. Type: ipconfig
echo   3. Look for "IPv4 Address"
echo   4. Use: http://YOUR_IP:8080
echo.
echo Phone:     http://YOUR_PC_IP:8080
echo Tablet:    http://YOUR_PC_IP:8080
echo Other PC:  http://YOUR_PC_IP:8080
echo.
echo ========================================
echo.

REM Try to open browser automatically
start http://localhost:8080

echo Dashboard opened in browser!
echo.
echo Press any key to stop the server...
pause > nul

REM Kill the server
taskkill /FI "WINDOWTITLE eq Dashboard Server" /F > nul 2>&1

echo.
echo ✅ Server stopped.
pause

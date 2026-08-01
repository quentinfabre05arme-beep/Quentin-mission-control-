@echo off
REM Chrome with Remote Debugging Launcher
REM Double-click this to launch Chrome with debugging enabled

echo Launching Chrome with remote debugging...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
echo.
echo Chrome launched with remote debugging on port 9222
echo OpenClaw can now connect to your logged-in browser session.
pause

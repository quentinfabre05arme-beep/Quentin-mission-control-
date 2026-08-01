@echo off
REM Secure Credential Storage Launcher
REM Run this to securely store your passwords

echo ======================================
echo  SECURE CREDENTIAL MANAGER
echo ======================================
echo.
echo This will encrypt your passwords with AES-256
echo and store them locally on your PC only.
echo.
echo Your password will NOT be visible in chat history.
echo.
pause

cd /d C:\Users\quent\.openclaw\workspace
node credential_manager.js store

echo.
echo Done! Your credentials are securely stored.
pause

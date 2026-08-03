@echo off
echo ========================================
echo  X AUTOMATION - HIMS Thread Posting
echo ========================================
echo.

REM Check if Chrome is running
tasklist /FI "IMAGENAME eq chrome.exe" 2>NUL | find /I /N "chrome.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [OK] Chrome is running
) else (
    echo [INFO] Starting Chrome...
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe"
    timeout /t 3 /nobreak >NUL
)

echo.
echo [STEP 1] Opening X compose page...
start "" "https://x.com/compose/tweet"

echo.
echo [STEP 2] Waiting for page to load...
timeout /t 3 /nobreak >NUL

echo.
echo ========================================
echo  MANUAL STEPS (Required - X detects automation)
echo ========================================
echo.
echo 1. Switch to Chrome browser
echo 2. Press F12 to open DevTools
echo 3. Click Console tab
echo 4. Copy the JavaScript below:
echo.
echo ----------------------------------------
type x_post_direct.js
echo ----------------------------------------
echo.
echo 5. Press Enter to run it
echo 6. Type: await postThread(["YOUR", "TWEETS", "HERE"])
echo 7. Press Enter
echo.
echo ========================================
pause

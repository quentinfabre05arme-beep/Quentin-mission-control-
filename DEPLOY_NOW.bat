@echo off
echo ========================================
echo  🚀 DEPLOY TO VERCEL (One-Click)
echo ========================================
echo.

REM Check Node.js
node --version > nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found! Install from nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js found
echo.

REM Install Vercel CLI if not present
echo Checking Vercel CLI...
vercel --version > nul 2>&1
if %errorlevel% neq 0 (
    echo Installing Vercel CLI...
    npm install -g vercel
)

echo ✅ Vercel CLI ready
echo.

REM Login to Vercel
echo ========================================
echo Step 1: Login to Vercel
echo ========================================
echo A browser will open. Login with your GitHub account.
echo.
vercel login

if %errorlevel% neq 0 (
    echo ❌ Login failed. Please try again.
    pause
    exit /b 1
)

echo ✅ Logged in!
echo.

REM Deploy
echo ========================================
echo Step 2: Deploy Dashboard
echo ========================================
echo.
echo When asked:
echo   Set up "mission_control"? [Y/n] → Type Y
echo   Which scope? [quentinvest] → Press Enter
echo   Link to existing project? [y/N] → Type N
echo   Project name? [mission-control] → Type: quentin-dashboard
echo.

cd /d "C:\Users\quent\.openclaw\workspace\mission_control"
vercel --prod

echo.
echo ========================================
echo  ✅ DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Your dashboard is now live at:
echo https://quentin-dashboard.vercel.app
echo.
echo 📱 Access from:
echo   - Your phone (anywhere)
echo   - Any PC (no need to keep yours on)
echo   - Share with friends
echo.
echo Bookmark it!
echo.
pause

@echo off
echo ========================================
echo  🚀 DEPLOY TO VERCEL (REAL WEBSITE)
echo ========================================
echo.
echo This will create a real website at:
echo https://quentin-dashboard.vercel.app
echo.

REM Check Node.js
node --version > nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found!
    echo Please install from: https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js found
echo.

REM Install Vercel CLI globally
echo Step 1: Installing Vercel CLI...
npm install -g vercel
echo ✅ Vercel CLI installed
echo.

REM Login to Vercel
echo ========================================
echo Step 2: Login to Vercel (Browser will open)
echo ========================================
echo Just click "Continue with GitHub"
echo.
vercel login

echo ✅ Logged in!
echo.

REM Deploy
echo ========================================
echo Step 3: Deploying Dashboard
echo ========================================
echo.
echo When asked:
echo   Set up "mission_control"? [Y/n] - Press Y
echo   Which scope? - Press Enter (your GitHub)
echo   Link to existing project? [y/N] - Press N
echo   Project name? - Type: quentin-dashboard
echo.

cd /d "C:\Users\quent\.openclaw\workspace\mission_control"
vercel --prod

echo.
echo ========================================
echo  ✅ REAL WEBSITE LIVE!
echo ========================================
echo.
echo Your professional dashboard is now at:
echo https://quentin-dashboard.vercel.app
echo.
echo 📱 Access from anywhere:
echo   - Your phone
echo   - Any PC
echo   - Share with anyone
echo.
echo 🔒 Features:
echo   - HTTPS (secure)
echo   - Global CDN (fast worldwide)
echo   - Always online
echo   - Professional URL
echo.
echo 🎯 Next: Add custom domain (quentin.com)
echo   Go to: https://vercel.com/dashboard
echo   Click your project
echo   Go to Settings -> Domains
echo.
pause

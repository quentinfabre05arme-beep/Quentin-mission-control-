@echo off
echo ========================================
echo  🚀 PUSH TO GITHUB (Quentin's PC)
echo ========================================
echo.

REM Go to clean deploy folder
cd /d "C:\Users\quent\.openclaw\workspace\clean-deploy"

echo Step 1: Initializing git...
git init

echo.
echo Step 2: Adding files...
git add .

echo.
echo Step 3: Committing...
git commit -m "feat: Initial dashboard

- World-class SAAS dashboard
- Tracks 5 goals
- Real-time progress
- Mobile responsive"

echo.
echo Step 4: Connecting to GitHub...
git remote add origin https://github.com/quentinfabre05arme-beep/Quentin-mission-control-.git

echo.
echo Step 5: Pushing to main branch...
git push -u origin main

echo.
echo ========================================
echo  ✅ DONE! Check your repo:
echo  https://github.com/quentinfabre05arme-beep/Quentin-mission-control-
echo ========================================
pause

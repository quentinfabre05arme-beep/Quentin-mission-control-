@echo off
REM Autonomy Core Engine - Windows Batch Runner
REM Runs the engine via Node.js

cd /d C:\Users\quent\.openclaw\workspace
node missions\autonomy_core\engine.js

exit /b %ERRORLEVEL%

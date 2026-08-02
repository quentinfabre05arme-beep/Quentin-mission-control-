@echo off
setlocal

REM Store Microsoft Graph credentials securely for Claw
REM AES-256-GCM encrypted vault

node credential_manager.js store microsoft_graph

pause

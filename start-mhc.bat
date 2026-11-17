@echo off
cd /d "%~dp0server"
echo Starting MHC Queue Server...
node index.js
pause

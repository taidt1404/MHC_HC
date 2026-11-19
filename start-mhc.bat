@echo off
cd /d "%~dp0server"
echo Starting MHC Queue Server...
if exist "%~dp0server\node.exe" (
    "%~dp0server\node.exe" index.js
) else (
    node index.js
)
pause

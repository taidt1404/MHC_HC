@echo off
title He Thong Man Hinh Cho Benh Vien - Port 55637
color 0A
set "APP_DIR=%~dp0server"
set "PORT=55637"

echo ==============================================================
echo    HE THONG MAN HINH CHO BENH VIEN HUNG CUONG - PORT %PORT%
echo ==============================================================

echo [1/2] Kiem tra va tat tien trinh cu tren cong %PORT% (neu co)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

cd /d "%APP_DIR%"
if exist "%APP_DIR%\node.exe" (
    set "NODE_BIN=%APP_DIR%\node.exe"
) else (
    set "NODE_BIN=node"
)

:loop
echo [2/2] Dang khoi chay MHC Server (%date% %time%)...
"%NODE_BIN%" index.js
echo Dich vu bi dung, tu dong khoi dong lai sau 3 giay...
timeout /t 3 >nul
goto loop

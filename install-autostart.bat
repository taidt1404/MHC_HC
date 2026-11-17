@echo off
setlocal
set "APP_DIR=%~dp0server"
set "PORT=55637"

if exist "%APP_DIR%\node.exe" (
    set "NODE_BIN=%APP_DIR%\node.exe"
) else (
    set "NODE_BIN=node"
)

echo [1/4] Dung tien trinh cu dang chay tren cong %PORT% (neu co)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo [2/4] Mo port %PORT% tren Windows Firewall...
netsh advfirewall firewall delete rule name="MHC Queue Server (%PORT%)" >nul 2>&1
netsh advfirewall firewall add rule name="MHC Queue Server (%PORT%)" dir=in action=allow protocol=TCP localport=%PORT%

echo [3/4] Dang ky Task Scheduler tu khoi dong cung Windows (MHC-Queue-Server)...
schtasks /end /tn "MHC-Queue-Server" >nul 2>&1
schtasks /create /tn "MHC-Queue-Server" /tr "cmd.exe /c cd /d \"%APP_DIR%\" && \"%NODE_BIN%\" index.js" /sc onstart /ru SYSTEM /f

echo [4/4] Khoi chay dich vu MHC-Queue-Server ngay lap tuc...
schtasks /run /tn "MHC-Queue-Server"

echo.
echo Hoan tat! MHC Queue Server dang chay tai cong %PORT%.
pause

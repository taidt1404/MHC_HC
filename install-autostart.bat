@echo off
setlocal
set "APP_DIR=%~dp0server"
set "PORT=55637"

echo [1/3] Mo port %PORT% tren Windows Firewall...
netsh advfirewall firewall delete rule name="MHC Queue Server (%PORT%)" >nul 2>&1
netsh advfirewall firewall add rule name="MHC Queue Server (%PORT%)" dir=in action=allow protocol=TCP localport=%PORT%

echo [2/3] Dang ky Task Scheduler tu khoi dong cung Windows (MHC-Queue-Server)...
schtasks /create /tn "MHC-Queue-Server" /tr "cmd.exe /c cd /d \"%APP_DIR%\" && node index.js" /sc onstart /ru SYSTEM /f

echo [3/3] Khoi chay dich vu MHC-Queue-Server ngay lap tuc...
schtasks /run /tn "MHC-Queue-Server"

echo.
echo Hoan tat! MHC Queue Server dang chay tai cong %PORT%.
pause

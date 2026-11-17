@echo off
setlocal
set "ROOT_DIR=%~dp0"
set "BAT_FILE=%~dp0Chay_He_Thong_MHC.bat"
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_DIR%\Chay_He_Thong_MHC.bat - Shortcut.lnk"
set "PORT=55637"

echo [1/3] Mo port %PORT% tren Windows Firewall...
netsh advfirewall firewall delete rule name="MHC Queue Server (%PORT%)" >nul 2>&1
netsh advfirewall firewall add rule name="MHC Queue Server (%PORT%)" dir=in action=allow protocol=TCP localport=%PORT%

echo [2/3] Xoa Task Scheduler cu (neu co) va tao Shortcut trong thu muc Startup...
schtasks /end /tn "MHC-Queue-Server" >nul 2>&1
schtasks /delete /tn "MHC-Queue-Server" /f >nul 2>&1

powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%BAT_FILE%'; $s.WorkingDirectory = '%ROOT_DIR%'; $s.Save()"

echo [3/3] Khoi chay cua so He Thong Man Hinh Cho Benh Vien - Port %PORT%...
start "He Thong Man Hinh Cho Benh Vien - Port %PORT%" "%BAT_FILE%"

echo.
echo Hoan tat! Da tao Shortcut trong Startup:
echo %SHORTCUT_PATH%
pause

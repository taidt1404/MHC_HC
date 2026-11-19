@echo off
chcp 65001 >nul
title Cai dat Tien ich MHC - BV Da Khoa Hung Cuong
color 0A

echo ================================================================
echo   CÀI ĐẶT TIỆN ÍCH MHC - TỰ ĐỘNG GỌI TRẢ KẾT QUẢ CHO BÁC SĨ
echo                   BỆNH VIỆN ĐA KHOA HÙNG CƯỜNG
echo ================================================================
echo.

set TARGET_DIR=C:\MHC-Extension

echo [1/3] Đang sao chép tiện ích vào %TARGET_DIR%...
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"
copy /Y "%~dp0manifest.json" "%TARGET_DIR%\" >nul
copy /Y "%~dp0content.js" "%TARGET_DIR%\" >nul
copy /Y "%~dp0popup.html" "%TARGET_DIR%\" >nul
copy /Y "%~dp0popup.js" "%TARGET_DIR%\" >nul
copy /Y "%~dp0icon.png" "%TARGET_DIR%\" >nul

echo [2/3] Đã lưu tiện ích an toàn tại: %TARGET_DIR%
echo.
echo [3/3] Đang mở trình duyệt Google Chrome...
start chrome.exe "chrome://extensions"

echo.
echo ================================================================
echo   CHỈ CẦN 2 THAO TÁC TRÊN CHROME VỪA MỞ (MẤT 5 GIÂY):
echo.
echo   1. Bật công tắc "Developer mode" (ở góc trên bên phải)
echo   2. Bấm nút "Load unpacked" (ở góc trên bên trái)
echo      -> Chọn thư mục: %TARGET_DIR%
echo.
echo   3. Bấm vào icon mảnh ghép 🧩 -> Chọn phòng khám của bạn -> Lưu!
echo ================================================================
echo.
pause

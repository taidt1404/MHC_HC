# Hệ thống Màn Hình Chờ Độc Lập (MHC) - Bệnh viện Đa khoa Hùng Cường

Ứng dụng Màn hình chờ (Queue Screen) độc lập kết nối trực tiếp PostgreSQL (chế độ chỉ đọc `read-only`), tự động cập nhật danh sách bệnh nhân thời gian thực mỗi 3 giây mà không cần F5 hay bấm nút kích hoạt thủ công từ HIS.

## 1. Cấu trúc thư mục
- `server/`: Backend Node.js + Express + `pg` (Connection Pool + In-memory Cache 1.5s + phục vụ file tĩnh React).
- `client/`: Frontend ReactJS + Vite tối ưu cho màn hình TV 16:9.

## 2. Cấu hình kết nối CSDL
Sao chép file `server/.env.example` thành `server/.env` và điền mật khẩu DB:

```env
PORT=55637
DB_HOST=192.168.110.42
DB_PORT=4078
DB_NAME=phuongdong
DB_USER=hanhnt
DB_PASSWORD=mat_khau_cua_ban
```

## 3. Chạy ứng dụng

### Chạy bản Production (Gộp chung API + Giao diện trên cổng `55637`)
```powershell
cd D:\WorkSpace\Projects\MHC
npm run build
npm start
```

Mở trình duyệt / TV tại:
- Trang chọn phòng: `http://localhost:55637/`
- Phòng Cận lâm sàng (tương thích đường dẫn HIS): `http://localhost:55637/subclinical-queue/<area_id>`
  - Ví dụ Phòng nội soi tiêu hóa P311: `http://localhost:55637/subclinical-queue/73c84d7a-b0a4-4e71-981a-ff8d94641cf1`
  - Ví dụ Phòng thăm dò chức năng P302: `http://localhost:55637/subclinical-queue/50a1993f-c63d-4a09-accb-2cda6d788a5c`
- Phòng khám (tương thích đường dẫn HIS): `http://localhost:55637/clinical-queue/<area_id>`
  - Ví dụ Phòng khám P204: `http://localhost:55637/clinical-queue/893d232a-2896-4575-95f0-7ec95bbacaff`

# Hướng dẫn cài đặt Tiện ích MHC - Tự động gọi bệnh nhân (Khám bệnh & CĐHA)

Tiện ích này cài trực tiếp trên trình duyệt **Google Chrome** hoặc **Microsoft Edge** trên máy tính phòng khám của Bác sĩ hoặc phòng Chẩn đoán hình ảnh (Siêu âm, X-quang, Nội soi, Thăm dò chức năng).

---

### Bước 1: Mở trang quản lý Tiện ích trên Trình duyệt

* Mở trình duyệt Chrome hoặc Edge trên máy tính phòng khám / CĐHA.
* Nhập vào thanh địa chỉ:
  * Trên Chrome: `chrome://extensions`
  * Trên Edge: `edge://extensions`
* Bật công tắc **"Chế độ dành cho nhà phát triển" (Developer mode)** ở góc trên bên phải màn hình.

---

### Bước 2: Cài đặt Tiện ích

1. Bấm nút **"Tải tiện ích đã giải nén" (Load unpacked)** ở góc trên bên trái.
2. Chọn thư mục tiện ích `extension` (hoặc chạy đúp chuột file `cai-dat-nhanh.bat` để máy tự động chép vào `C:\MHC-Extension`).
3. Tiện ích **"MHC - Tự Động Gọi Bệnh Nhân (Khám & CĐHA)"** sẽ xuất hiện ngay trên thanh công cụ của trình duyệt.

---

### Bước 3: Cấu hình phòng (Chỉ làm 1 lần duy nhất)

1. Bấm vào biểu tượng tiện ích (icon mảnh ghép 🧩 -> ghim icon MHC lên thanh công cụ).
2. Kiểm tra địa chỉ máy chủ MHC (mặc định: `http://192.168.110.184:55637`).
3. Bấm **"1. Tải danh sách phòng"**.
4. Chọn đúng phòng của máy tính đó (ví dụ: `Phòng khám P205`, `Phòng chờ siêu âm`, `Phòng nội soi tiêu hóa P311`, v.v.).
5. Bấm **"Lưu cấu hình"**.
6. **F5** lại tab phần mềm HIS 1 lần để kích hoạt.

---

### Cách hoạt động hàng ngày (100% tự động dưới nền):

* **Tại Phòng khám Ngoại trú**:
  * Khi bác sĩ click vào bệnh nhân có kết quả xét nghiệm/CĐHA quay về (**ĐÃ CÓ KẾT QUẢ**), tiện ích sẽ tự động đẩy bệnh nhân đó lên cột **"ĐANG THỰC HIỆN / MỜI VÀO PHÒNG"** ngoài TV.
  * Khi bấm "Tìm kiếm", "Làm mới", chuyển danh sách hoặc "Hoàn thành", tiện ích tự động gỡ khỏi cột gọi.

* **Tại Phòng Chẩn đoán hình ảnh (Siêu âm / X-quang / Nội soi)**:
  * Khi kỹ thuật viên / bác sĩ click vào bệnh nhân trong tab `CHỜ THỰC HIỆN` hoặc mở tab `LÀM BÁO CÁO CĐHA`, tiện ích tự động đẩy bệnh nhân đó lên cột **"ĐANG THỰC HIỆN / MỜI VÀO PHÒNG"** ngoài TV.
  * Khi bấm quay lại tab `CHỜ THỰC HIỆN`, bấm `Tìm kiếm`, `Làm mới` hoặc `Hoàn thành`, tiện ích tự động gỡ khỏi cột gọi và trả về danh sách chờ.

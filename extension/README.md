# Hướng dẫn cài đặt Tiện ích MHC - Tự động gọi trả kết quả

Tiện ích này cài trực tiếp trên trình duyệt **Google Chrome** hoặc **Microsoft Edge** trên máy tính phòng khám của Bác sĩ.

---

### Bước 1: Mở trang quản lý Tiện ích trên Trình duyệt

* Mở trình duyệt Chrome hoặc Edge trên máy Bác sĩ.
* Nhập vào thanh địa chỉ:
  * Trên Chrome: `chrome://extensions`
  * Trên Edge: `edge://extensions`
* Bật công tắc **"Chế độ dành cho nhà phát triển" (Developer mode)** ở góc trên bên phải màn hình.

---

### Bước 2: Cài đặt Tiện ích

1. Bấm nút **"Tải tiện ích đã giải nén" (Load unpacked)** ở góc trên bên trái.
2. Chọn thư mục: `d:\WorkSpace\Projects\MHC\extension` (hoặc thư mục `extension` được copy sang máy bác sĩ).
3. Tiện ích **"MHC - Tự Động Gọi Trả Kết Quả"** sẽ xuất hiện ngay trên thanh công cụ của trình duyệt.

---

### Bước 3: Cấu hình phòng khám (Chỉ làm 1 lần duy nhất)

1. Bấm vào biểu tượng tiện ích (icon mảnh ghép 🧩 -> ghim icon MHC lên thanh công cụ).
2. Nhập địa chỉ máy chủ MHC (ví dụ: `http://192.168.110.184:55637`).
3. Bấm **"1. Tải danh sách phòng khám"**.
4. Chọn đúng phòng khám của máy tính đó (ví dụ: `Phòng khám Sản Phụ khoa P312`).
5. Bấm **"Lưu cấu hình"**.

---

### Cách sử dụng hàng ngày:

* **Bác sĩ không cần thao tác gì thêm.**
* Cứ khi nào bác sĩ click vào bệnh nhân có trạng thái **"ĐÃ CÓ KQ"** trên phần mềm HIS, tiện ích sẽ tự động gửi lệnh để màn hình ngoài cửa TV nhảy sang cột bên trái **"ĐANG THỰC HIỆN / MỜI VÀO PHÒNG"**.
* Khi bác sĩ khám xong bấm **"Hoàn thành khám"** trên HIS, bệnh nhân sẽ tự động biến mất khỏi màn hình ngoài cửa.

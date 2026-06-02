DISTRIBUTED SMPC SALARY SURVEY
DISTRIBUTED DATABASE FINAL PROJECT

--- LỆNH KHỞI CHẠY NHANH DỰ ÁN ---
Gõ lệnh duy nhất sau để chạy toàn bộ hệ thống:
  npm run start-all
Sau đó truy cập trình duyệt tại địa chỉ:
  http://127.0.0.1:3001/start-secure-sum
----------------------------------

1. THÔNG TIN SINH VIÊN
Sinh viên: Võ Gia Huy
Mã số sinh viên: N23DCCN163
Lớp: D23CQCN03-N
Email: n23dccn163@student.ptithcm.edu.vn
Đơn vị: Học viện Công nghệ Bưu chính Viễn thông (PTIT), Cơ sở TP. Hồ Chí Minh

2. THÔNG TIN ĐỀ TÀI
Đề tài số: 104
Tên đề tài: Secure Multi-party Computation (SMPC) - Salary Survey
Giao thức sử dụng: Secure Sum tuần hoàn

3. KIẾN TRÚC MẠNG VÀ CỔNG KẾT NỐI
Hệ thống gồm 4 nút mạng độc lập chạy trên localhost:
- Site A: Cổng 3001 (Đơn vị khởi tạo và giải mã)
- Site B: Cổng 3002
- Site C: Cổng 3003
- Site D: Cổng 3004
- Hacker Proxy: Cổng 3005 (Mô phỏng nghe lén trên đường truyền)

4. HƯỚNG DẪN CÀI ĐẶT VÀ VẬN HÀNH

4.1. Cài đặt các thư viện phụ thuộc
Chạy lệnh sau tại thư mục gốc của dự án:
npm install

4.2. Khởi chạy đồng bộ tất cả các site
Chạy kịch bản tự động để mở tất cả các máy chủ cùng một lúc:
npm run start-all

4.3. Kích hoạt giao thức chế độ bình thường
Truy cập đường dẫn sau trên trình duyệt hoặc sử dụng cURL:
http://127.0.0.1:3001/start-secure-sum

4.4. Kích hoạt giao thức chế độ có nghe lén (Hacker Mode)
Truy cập đường dẫn sau để chạy mô phỏng qua cổng Hacker Proxy:
http://127.0.0.1:3001/start-secure-sum?hacker=true

5. KẾT QUẢ ĐẦU RA MẪU MONG ĐỢI
Hệ thống tính tổng quỹ lương toàn cục và trung bình lương:
{
  "globalSum": 580000,
  "globalAverage": 145000
}
**NHẬT KÝ THỰC THI VÀ KẾT QUẢ THỰC NGHIỆM**
**ĐỀ TÀI: KHẢO SÁT LƯƠNG BẢO MẬT SỬ DỤNG SMPC VỚI GIAO THỨC SECURE SUM**

Tài liệu này ghi nhận toàn bộ các chỉnh sửa đã thực hiện, hướng dẫn chạy hệ thống thực tế và kết quả chạy kiểm thử chứng minh tính chính xác toán học cùng mức độ bảo mật của giao thức Secure Sum.

---

1. CÁC THÀNH PHẦN ĐÃ TRIỂN KHAI (IMPLEMENTED COMPONENTS)

1.1. Bộ điều phối khởi chạy hệ thống (start-all.js):
Khởi chạy song song 5 tiến trình độc lập bao gồm Site A, Site B, Site C, Site D và Hacker Proxy.
Gộp toàn bộ đầu ra (stdout) về một cửa sổ terminal duy nhất, gắn nhãn định danh cho mỗi site (ví dụ: [Site-A], [Site-B], [Hacker]) giúp dễ dàng theo dõi dữ liệu truyền tuần hoàn giữa các cổng.

1.2. Mô-đun giả lập nghe lén đường truyền (hacker/hacker.js):
Hoạt động trên cổng 3005 như một proxy trung gian. Khi được kích hoạt, tệp này nhận gói dữ liệu truyền đi từ Site A, in ra phân tích toán học chứng minh kẻ nghe lén không thể giải mã lương gốc, sau đó chuyển tiếp gói tin nguyên vẹn sang Site B để giao thức hoàn thành chu trình.

1.3. Site khởi tạo và giải mã (site-a/server.js):
Thay đổi các URL kết nối từ "localhost" thành "127.0.0.1" để đảm bảo giao tiếp ổn định trên môi trường Windows (tránh lỗi xung đột phân giải IPv6).
Bổ sung tham số truy vấn "?hacker=true" tại endpoint khởi động để tùy chọn chuyển hướng gói tin qua cổng của Hacker Proxy.

1.4. Các nút tích lũy trung gian (site-b, site-c, site-d):
Chuyển đổi toàn bộ liên kết giao tiếp sang địa chỉ IP "127.0.0.1" để đảm bảo tính ổn định và hiệu năng cao.

1.5. Cấu hình quản lý dự án (package.json):
Thêm các kịch bản thực thi bao gồm "hacker" và "start-all" để thuận tiện cho việc chạy dự án bằng lệnh npm.

---

2. HƯỚNG DẪN VẬN HÀNH (OPERATIONAL INSTRUCTIONS)

2.1. Bước 1: Cài đặt các thư viện phụ thuộc
Mở terminal tại thư mục dự án và thực hiện lệnh:
```bash
npm install
```

2.2. Bước 2: Khởi chạy đồng bộ các nút mạng
Sử dụng lệnh sau để khởi chạy đồng thời tất cả các máy chủ Express độc lập và proxy nghe lén:
```bash
npm run start-all
```
Màn hình console sẽ thông báo khởi động thành công 5 tiến trình tương ứng trên các cổng 3001, 3002, 3003, 3004 và 3005.

2.3. Bước 3: Thực hiện giao thức trong điều kiện bình thường
Mở trình duyệt web hoặc công cụ cURL để gọi endpoint:
http://127.0.0.1:3001/start-secure-sum
Hệ thống sẽ trả về kết quả định dạng JSON chứa tổng lương toàn công ty và lương trung bình:
{
  "globalSum": 580000,
  "globalAverage": 145000
}

2.4. Bước 4: Thực hiện giao thức trong điều kiện có nghe lén (Hacker Mode)
Gọi endpoint kiểm thử chế độ nghe lén:
http://127.0.0.1:3001/start-secure-sum?hacker=true
Kết quả cuối cùng thu được vẫn chính xác, đồng thời màn hình điều phối sẽ in ra thông tin cảnh báo nghe lén và cơ sở toán học chứng minh tính an toàn thông tin.

---

3. KẾT QUẢ THỰC NGHIỆM GHI NHẬN (VALIDATION LOGS)

Dưới đây là nhật ký hoạt động thực tế trích xuất từ màn hình console khi chạy thử nghiệm cả hai kịch bản:

```text
[Site-A] Site A running on port 3001
[Site-B] Site B running on port 3002
[Site-C] Site C running on port 3003
[Hacker] Hacker Sniffer Proxy running on port 3005
[Site-D] Site D running on port 3004

// --- Kịch bản 1: Chạy giao thức chế độ bình thường (A -> B -> C -> D -> A) ---
[Site-A] Random Mask: 17795
[Site-A] Send To Site B (Port 3002): 137795
[Site-B] Received: 137795
[Site-B] Send To Site C: 287795
[Site-C] Received: 287795
[Site-C] Send To Site D: 467795
[Site-A] Encrypted Total: 597795
[Site-A] Random Mask: 17795
[Site-A] Final Total: 580000

// --- Kịch bản 2: Chạy giao thức qua cổng nghe lén (A -> Hacker -> B -> C -> D -> A) ---
[Site-A] Random Mask: 67707
[Site-A] Send To Hacker Proxy (Port 3005): 187707

[Hacker] =================== HACKER INTERCEPTED PACKET ===================
[Hacker] [!] ALERT: Intercepted data packet on the wire between Site A and Site B!
[Hacker] [RAW PAYLOAD]: { partialSum: 187707 }
[Hacker] [MATHEMATICAL ANALYSIS]:
[Hacker]    Equation caught: partialSum = Salary_A + R
[Hacker]    Equation values: 187707 = Salary_A + R
[Hacker]    Problem: Since R is a cryptographically secure random mask known ONLY to Site A,
[Hacker]             the equation has 1 equation but 2 unknown variables (Salary_A and R).
[Hacker]             It has INFINITE mathematical solutions!
[Hacker]    Examples of possible solutions:
[Hacker]      - If R = 10,000  => Salary_A = 177707
[Hacker]      - If R = 50,000  => Salary_A = 137707
[Hacker]      - If R = 90,000  => Salary_A = 97707
[Hacker]      - If R = 120,000 => Salary_A = 67707
[Hacker] [SECURITY STATUS]: Encryption secure. Zero information leaked about Site A's true salary.
[Hacker] =================================================================

[Site-B] Received: 187707
[Site-B] Send To Site C: 337707
[Site-C] Received: 337707
[Site-C] Send To Site D: 517707
[Site-A] Encrypted Total: 647707
[Site-A] Random Mask: 67707
[Site-A] Final Total: 580000
```

3.1. Nhận xét đánh giá
Hiệu quả tính toán (Accuracy): Cả hai kịch bản chạy thử nghiệm đều cho ra kết quả tổng lương chính xác tuyệt đối là 580,000 (đúng bằng tổng giá trị lưu trữ riêng tư tại 4 phòng ban: 120,000 + 150,000 + 180,000 + 130,000). Sai số thực nghiệm bằng 0.
Hiệu quả bảo mật (Security): Trong kịch bản có nghe lén, hacker chỉ bắt được dữ liệu thô chuyển đi là 187,707. Do không nắm giữ số ngẫu nhiên R = 67,707, hacker không có cách nào giải phương trình để suy ra mức lương thực tế của phòng ban IT (120,000). Quyền riêng tư của đơn vị khởi tạo được bảo vệ an toàn.

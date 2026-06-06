# DÀN Ý SIDES THUYẾT TRÌNH BẢO VỆ ĐỒ ÁN (PRESENTATION SLIDES OUTLINE)
## ĐỀ TÀI: GIAO THỨC CỘNG LƯƠNG BẢO MẬT TRÊN HỆ CSDL PHÂN TÁN (SMPC SECURE SUM)
---

### SLIDE 1: TRANG BÌA (COVER PAGE)
* **Tiêu đề:** Nghiên Cứu & Triển Khai Giao Thức Cộng Lương Bảo Mật (Secure Sum) Bảo Vệ Quyền Riêng Tư Trên Hệ CSDL Phân Tán
* **Mã đề tài & Phân loại:** Đề tài số #104 – Category 11: Security and Privacy
* **Sinh viên thực hiện:** Võ Gia Huy (MSSV: N23DCCN163 - Lớp: D23CQCN03-N)
* **Đơn vị:** Học viện Công nghệ Bưu chính Viễn thông (PTIT), Cơ sở TP. Hồ Chí Minh
* **Giáo trình tham chiếu:** *Principles of Distributed Database Systems* (M. Tamer Özsu & Patrick Valduriez)

---

### SLIDE 2: ĐẶT VẤN ĐỀ & ĐỘNG LỰC ĐỀ TÀI (PROBLEM & MOTIVATION)
* **Bối cảnh:** Các phòng ban doanh nghiệp quản lý dữ liệu lương độc lập và đòi hỏi tính tự trị dữ liệu cục bộ cao (Local Autonomy).
* **Thách thức:** Cần tính tổng lương toàn doanh nghiệp nhưng giải pháp tập trung truyền thống (Query Coordinator) yêu cầu gửi lương thô về một máy chủ, gây nguy cơ rò rỉ dữ liệu nhạy cảm nếu máy chủ bị hack hoặc đường truyền bị nghe lén.
* **Câu hỏi nghiên cứu:** *Làm thế nào để tính tổng lương toàn cục mà không một phòng ban nào phải tiết lộ lương thô của mình cho các phòng ban khác hoặc máy chủ trung tâm?*
* **Nguyên tắc thiết kế:** Loại bỏ hoàn toàn API public truy xuất dữ liệu thô (no `GET /salary` API), bảo đảm quyền riêng tư tuyệt đối cho dữ liệu ở trạng thái tĩnh (data at rest).

---

### SLIDE 3: GIAO THỨC SECURE SUM VÒNG TRÒN (PROTOCOL MATHEMATICS)
* **Cơ chế hoạt động:**
  * Gọi $X_A, X_B, X_C, X_D$ là lương riêng tư cục bộ của các Site A, B, C, D.
  * **Pha 1 (Che giấu):** Site A sinh số ngẫu nhiên lớn $R$ (10 chữ số), lưu $R$ trong RAM. Gửi $S_1 = X_A + R$ sang Site B.
  * **Pha 2 (Tích lũy tuần hoàn):** Các site trung gian nhận tổng tích lũy bán phần, cộng dồn lương của mình rồi chuyển tiếp:
    * Site B: $S_2 = S_1 + X_B = X_A + X_B + R$
    * Site C: $S_3 = S_2 + X_C = X_A + X_B + X_C + R$
    * Site D: $S_4 = S_3 + X_D = X_A + X_B + X_C + X_D + R$
  * **Pha 3 (Giải mã):** Site D gửi trả $S_4$ về Site A. Site A thực hiện trừ khử nhiễu:
    * $S_{final} = S_4 - R = X_A + X_B + X_C + X_D$ (Tổng lương thực tế)
    * Lương trung bình: theo phòng ban ($S_{final} / 4$) và theo nhân viên ($S_{final} / 12$).

---

### SLIDE 4: KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE)
* **Mô hình Shared-Nothing:** 4 trạm Express Node.js chạy độc lập trên 4 cổng TCP khác nhau để mô phỏng phân tán:
  * **Site A (Cổng 3001):** Nút khởi trị giao dịch & giải mã (Transaction Coordinator).
  * **Site B (Cổng 3002), Site C (Cổng 3003), Site D (Cổng 3004):** Các trạm tích lũy trung gian độc lập.
  * **Hacker Sniffer Proxy (Cổng 3005):** Đóng vai trò kẻ tấn công nghe lén đường truyền mạng nối giữa Site A và B.
* **Tầng giao tiếp:** REST API phi đồng bộ sử dụng thư viện `Axios`.
* **Lưu trữ:** Mỗi site lưu trữ vật lý file `salary.json` riêng tư trong phân vùng đĩa cứng của mình, đảm bảo tính tự trị dữ liệu cao nhất.

---

### SLIDE 5: THIẾT KẾ BỘ DỮ LIỆU ĐỘNG & GOM CỤM CỤC BỘ (DYNAMIC DATASET & LOCAL AGGREGATION)
* **Điểm yếu của mô hình cũ:** `salary.json` chỉ chứa 1 con số tĩnh thô sơ, thiếu tính thực tế của cơ sở dữ liệu phân tán.
* **Cải tiến thiết kế bộ dữ liệu động:** 
  * Thay thế bằng bảng nhân viên chi tiết (`employees` list) gồm `name`, `role`, `salary`.
  * Mỗi site chịu trách nhiệm quản lý cơ sở dữ liệu nhân viên độc lập của mình.
* **Gom cụm cục bộ (Local Aggregation):** 
  * Khi giao thức kích hoạt, các site thực hiện hàm `reduce` trên bộ nhớ để tự tính toán tổng lương của site mình trước:
    `const localSalary = salaryData.employees.reduce((sum, emp) => sum + emp.salary, 0);`
  * Đảm bảo chỉ truyền con số tổng hợp, che giấu hoàn toàn thông tin chi tiết của từng nhân viên đối với các site khác.

---

### SLIDE 6: MÔ HÌNH ĐE DỌA & CƠ CHẾ PHÒNG THỦ (THREAT MODEL & DEFENSE)
* **Tác nhân đe dọa (Attacker):** Kẻ tấn công thụ động (Passive Eavesdropper) nghe lén dữ liệu trên đường truyền mạng giữa các site.
* **Mục tiêu (Goal):** Thu thập dữ liệu lương thô của các phòng ban nhằm đánh cắp thông tin nhạy cảm.
* **Cơ chế phòng thủ (Defense):**
  * Sử dụng mặt nạ mật mã ngẫu nhiên $R$ (10 chữ số sinh từ `crypto.randomInt()`).
  * Giao thức Secure Sum tuần hoàn mạng vòng (Ring Topology).
  * Che giấu khóa $R$ và lương thô trong bộ nhớ RAM, tuyệt đối không xuất ra màn hình console hay file ghi nhật ký (zero log leakage).
* **Kết quả đạt được (Result):**
  * Kẻ nghe lén chỉ bắt được gói tin chứa giá trị tích lũy làm nhiễu $S_1 = X_A + R$.
  * Phương trình có 1 phương trình nhưng 2 ẩn số ($X_A$ và $R$), dẫn tới **vô số bộ nghiệm**. Hacker hoàn toàn bất lực trong việc suy ra lương thật của Site A.

---

### SLIDE 7: KỊCH BẢN DEMO 1: CHẠY GIAO THỨC BÌNH THƯỜNG (NORMAL FLOW)
* **Đường truyền:** Client $\rightarrow$ Site A (:3001) $\rightarrow$ Site B (:3002) $\rightarrow$ Site C (:3003) $\rightarrow$ Site D (:3004) $\rightarrow$ Site A (/final-result) $\rightarrow$ Client.
* **Console Logs an toàn (Hiding Secret Mask & Raw Salaries):**
  * `[Site A] Transaction ID: 7cc53086-4e55-4428-b0a2-9214a1e94473`
  * `[Site A] Random Mask (R): [HIDDEN - stored in RAM only]`
  * `[Site A] Partial Sum (S1): 4729223952`
  * `[Site B] Received partialSum: 4729223952 | Send To Site C: 4729373952`
  * `[Site D] Received partialSum: 4729553952 | Send To Site A: S4 = 4729683952`
  * `[Site A] Decrypted Total: 580000 | Global Average: 145000`
* **Ưu điểm:** Lương thô của các site hoàn toàn không in ra terminal, bảo mật thông tin tối đa trong phiên chạy.

---

### SLIDE 8: KỊCH BẢN DEMO 2: CHẾ ĐỘ NGHE LÉN (HACKER MODE - PASSIVE SNIFFING)
* **Đường truyền:** Dữ liệu từ Site A đi qua Hacker Proxy (:3005) trước khi đến Site B.
* **Phân tích của Hacker Proxy:**
  * Bắt gói tin: `partialSum = 5831902467`
  * Phương trình bắt được: $5831902467 = X_A + R$
  * Hacker phân tích các nghiệm khả dĩ (sử dụng các R ngẫu nhiên mô phỏng):
    * Nếu $R = 1,234,567,890 \implies X_A = 4597334577$ (Vô lý)
    * Nếu $R = 5,555,555,555 \implies X_A = 276346912$ (Vô lý)
  * Trạng thái bảo mật: An toàn tuyệt đối, zero thông tin bị rò rỉ.

---

### SLIDE 9: KỊCH BẢN DEMO 3: TẤN CÔNG CHỦ ĐỘNG (ACTIVE MITM TAMPERING)
* **Kịch bản:** Kích hoạt chế độ chỉnh sửa dữ liệu của Hacker Proxy:
  `http://127.0.0.1:3001/start-secure-sum?hacker=true&tamper=true`
* **Hành vi tấn công:** Hacker Proxy tại cổng 3005 đánh chặn gói tin chứa `partialSum` và cộng thêm `999999` trước khi chuyển tiếp cho Site B.
* **Console Logs:**
  * `[Hacker] [!] ACTIVE ATTACK (MitM Tampering): Injecting false data into payload!`
  * `[Hacker]     Modifying partialSum from 5831902467 to 5832902466`
  * `[Site A] Decrypted Total: 1579999 | Global Average: 394999.75`
* **Phân tích học thuật:** Site A nhận về kết quả giải mã sai lệch hoàn toàn (`1579999` thay vì `580000`), phát hiện ngay thông tin bị thay đổi. Gợi mở giải pháp khắc phục bằng HMAC hoặc Chữ ký số chặng để bảo vệ tính toàn vẹn (Integrity).

---

### SLIDE 10: KỊCH BẢN DEMO 4: CHỊU LỖI PHÂN TÁN (FAULT TOLERANCE)
* **Kịch bản:** Tắt Site C (:3003) và kích hoạt giao thức.
* **Cơ chế xử lý:**
  * **Axios Timeout (3000ms):** Site B phát hiện Site C không phản hồi sau 3 giây.
  * **Lan truyền lỗi phân tán (Distributed Error Propagation):** Site B ngắt giao thức, trả về mã trạng thái `502 Bad Gateway` kèm định danh nút lỗi cụ thể.
  * **Giải phóng bộ nhớ:** Site A nhận lỗi 502, lập tức hủy bỏ giao dịch (Abort) và xóa `transactionId` tương ứng khỏi Map để tránh rò rỉ RAM (memory leak).
* **Ý nghĩa:** Bảo đảm tính Nhất quán (Consistency) theo định lý CAP thay vì cố chạy tiếp để cho ra kết quả sai lệch.

---

### SLIDE 11: KỊCH BẢN DEMO 5: ĐỐI CHIẾU XÁC THỰC ĐỘNG (DYNAMIC VERIFICATION MODE)
* **Cơ chế xác thực động:** Gọi endpoint `GET /verify`.
* **Cải tiến loại bỏ hardcode:**
  * Site A đóng vai trò kiểm toán viên (Trusted Auditor), gọi HTTP API GET /local-summary để thu thập tổng cục bộ và số lượng nhân viên từ các site khác, duy trì tính tự trị Shared-Nothing.
  * Đối chiếu tự động: Nếu dữ liệu nhân viên thay đổi, Ground Truth tự động cập nhật theo thời gian thực.
* **Console Logs:**
  * `[Site A] GET /verify -> Ground Truth Sum: 580000 | Diff: 0 (Correctness Verified!)`
* **Kết quả:** Sai số bằng 0, chứng minh thuật toán đúng đắn 100% về mặt toán học.

---

### SLIDE 12: ĐO LƯỜNG HIỆU NĂNG ĐỊNH LƯỢNG (BENCHMARK PERFORMANCE METRICS)
* **Cơ chế kiểm thử:** Gọi endpoint `GET /benchmark` để đối chiếu số liệu định lượng:
  * **Traditional Centralized Coordinator (Truyền thống):**
    * Số chặng mạng: 6 hops (3 requests + 3 responses).
    * Băng thông truyền tải: 569 bytes (tăng tuyến tính O(N) theo số lượng nhân viên).
    * Rủi ro: Rất cao do truyền chi tiết bảng lương thô nhạy cảm qua mạng.
  * **SMPC Secure Sum Ring (Đề xuất):**
    * Số chặng mạng: 8 hops (4 requests + 4 responses khép kín đồng bộ).
    * Băng thông truyền tải: 396 bytes (cố định O(1) bất kể số lượng nhân viên).
    * Rủi ro: Không có, chỉ truyền tổng bán phần đã che giấu.
* **Kết luận định lượng:** Tiết kiệm băng thông **1.44x** (tăng mạnh khi dữ liệu lớn hơn), giảm thiểu dung lượng payload truyền tải và bảo mật dữ liệu thô an toàn tuyệt đối.

---

### SLIDE 13: TẬP CÂU HỎI VẤN ĐÁP & HƯỚNG DẪN TRẢ LỜI BẢO VỆ (Q&A DEFEND GUIDE)
1. **Hỏi:** *Tại sao gọi là SMPC trong khi đây chỉ là Secure Sum?*
   * **Trả lời:** Secure Sum mạng vòng là một giao thức cơ bản và điển hình thuộc lớp bài toán Tính toán đa bên an toàn (SMPC). Đối với hệ thống quy mô lớn, giao thức có thể mở rộng lên các thuật toán phức tạp hơn như Chia sẻ bí mật Shamir (Shamir's Secret Sharing) hoặc Mã hóa đồng cấu (Homomorphic Encryption).
2. **Hỏi:** *Hệ thống chống lại Man-in-the-Middle can thiệp chỉnh sửa dữ liệu như thế nào?*
   * **Trả lời:** Trong demo (tamper mode), chúng ta đã chứng minh nếu hacker can thiệp sửa đổi partialSum, kết quả cuối cùng thu được sẽ bị sai lệch hoàn toàn. Để ngăn chặn chủ động, hướng phát triển của hệ thống là tích hợp HMAC (Mã xác thực thông điệp) khóa đối xứng hoặc Chữ ký số mã hóa chặng gửi.
3. **Hỏi:** *Hạn chế của mô hình Secure Sum mạng vòng là gì? Có demo được không?*
   * **Trả lời:** Đó là tấn công thông đồng (Collusion Attack) khi hai nút lân cận cấu kết với nhau để giải mã lương nút ở giữa. Chúng ta đã xây dựng thành công kịch bản thực nghiệm thông qua endpoint `/collusion-demo` chứng minh lỗ hổng này. Biện pháp phòng vệ gồm định tuyến ngẫu nhiên hoặc Shamir's Secret Sharing.

---

### SLIDE 14: KẾT LUẬN & ĐÁNH GIÁ ĐỒ ÁN
* **Điểm mạnh:**
  * Hiện thực hóa thành công mô hình SMPC bảo vệ quyền riêng tư và kiến trúc phân tán Shared-Nothing theo lý thuyết của giáo trình Özsu & Valduriez.
  * Có cơ chế chịu lỗi phân tán tự động (timeout 3s, HTTP 502, RAM cleanup).
  * Demo an toàn thông tin thuyết phục thông qua Hacker Proxy và che giấu vết in terminal.
  * Số liệu thực nghiệm định lượng rõ ràng, chứng minh khả năng tối ưu hóa băng thông mạng.
* **Định hướng tương lai:** Tích hợp tầng bảo mật HTTPS (SSL/TLS) và triển khai Chữ ký số mã hóa chặng gửi.

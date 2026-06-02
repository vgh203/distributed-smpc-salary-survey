BẢN PHÂN TÍCH LÝ THUYẾT CƠ SỞ DỮ LIỆU PHÂN TÁN
ĐỀ TÀI: KHẢO SÁT LƯƠNG BẢO MẬT SỬ DỤNG SMPC VỚI GIAO THỨC SECURE SUM
MÃ ĐỀ TÀI: 104

---

1. GIỚI THIỆU CHUNG VỀ LÝ THUYẾT ÁP DỤNG

Dự án nghiên cứu này áp dụng các nguyên lý cốt lõi của Hệ quản trị Cơ sở dữ liệu phân tán (DDBMS) được trình bày trong giáo trình "Distributed Database Management Systems: A Practical Approach" của hai tác giả Saeed K. Rahimi và Frank S. Haug (Nhà xuất bản Wiley, 2010). Các nội dung lý thuyết chính được tích hợp và làm sáng tỏ thông qua dự án bao gồm:
  - Phân mảnh ngang dữ liệu (Horizontal Fragmentation) tại Chương 2.
  - Bảo mật dữ liệu phân tán và tính toán bảo vệ quyền riêng tư (Privacy-preserving Distributed Aggregation).
  - Khả năng phục hồi và chịu lỗi của hệ thống phân tán (Distributed Fault Tolerance and Crash Recovery) tại Chương 8.

---

2. PHÂN MẢNH NGANG DỮ LIỆU TRONG HỆ THỐNG PHÂN TÁN

Trong hệ cơ sở dữ liệu phân tán, phân mảnh dữ liệu là quá trình chia nhỏ một quan hệ (bảng) thành các quan hệ con (mảnh) nhỏ hơn để lưu trữ tại các trạm (sites) khác nhau nhằm tăng hiệu năng truy vấn cục bộ và tính tự trị. Dự án này ứng dụng phương pháp Phân mảnh ngang nguyên thủy (Primary Horizontal Fragmentation).

2.1. Định nghĩa bảng lương gốc và vị từ phân mảnh
Giả sử hệ thống có một bảng dữ liệu nhân sự toàn cục lưu trữ thông tin lương của toàn doanh nghiệp được định nghĩa như sau:
  - Tên quan hệ gốc: Luong (Mã số nhân viên, Họ tên, Đơn vị, Lương thực)
  - Thuộc tính phân mảnh chính: Đơn vị (Site)

Các vị từ phân mảnh ngang nguyên thủy (Primary Predicates) được xác định để phân chia bảng Luong thành 4 phần tương ứng với 4 phòng ban lưu trữ tại các Site độc lập:
  - Vị từ P_A: Đơn vị = 'Site A'
  - Vị từ P_B: Đơn vị = 'Site B'
  - Vị từ P_C: Đơn vị = 'Site C'
  - Vị từ P_D: Đơn vị = 'Site D'

Kết quả thu được 4 mảnh dữ liệu ngang phân tán vật lý:
  - Luong_A = Chọn các bản ghi thỏa mãn vị từ P_A từ bảng Luong (Lưu tại Site A - Cổng 3001)
  - Luong_B = Chọn các bản ghi thỏa mãn vị từ P_B từ bảng Luong (Lưu tại Site B - Cổng 3002)
  - Luong_C = Chọn các bản ghi thỏa mãn vị từ P_C từ bảng Luong (Lưu tại Site C - Cổng 3003)
  - Luong_D = Chọn các bản ghi thỏa mãn vị từ P_D từ bảng Luong (Lưu tại Site D - Cổng 3004)

2.2. Chứng minh 3 quy tắc đúng đắn của phân mảnh ngang
Theo lý thuyết tại Mục 2.3 trong giáo trình của Saeed K. Rahimi, một thiết kế phân mảnh dữ liệu ngang được coi là đúng đắn và chính xác khi và chỉ khi thỏa mãn đầy đủ 3 quy tắc học thuật sau đây:

a) Quy tắc tính đầy đủ (Completeness Rule)
  - Định nghĩa lý thuyết: Một quan hệ R được phân rã thành các mảnh R_1, R_2, ..., R_n. Phép phân rã là đầy đủ khi và chỉ khi mỗi mục dữ liệu nằm trong R đều thuộc ít nhất một mảnh R_i.
  - Chứng minh thực tế: Tập hợp các vị từ P_A, P_B, P_C, P_D bao phủ toàn bộ các giá trị có thể có của thuộc tính phân mảnh Đơn vị. Do mỗi nhân viên trong công ty bắt buộc phải thuộc một trong bốn phòng ban (Site A, Site B, Site C, hoặc Site D), nên bất kỳ bản ghi nhân viên nào nằm trong bảng dữ liệu Luong toàn cục đều được phân bổ vào đúng một mảnh tương ứng tại site đó. Không có bản ghi nào bị bỏ sót hay nằm ngoài 4 mảnh này.

b) Quy tắc tính tái thiết (Reconstruction Rule)
  - Định nghĩa lý thuyết: Nếu quan hệ R được phân rã thành các mảnh R_1, R_2, ..., R_n, thì phải tồn tại một phép toán phân tán để tái thiết lại quan hệ R gốc từ các mảnh thành phần mà không làm mất mát hay biến đổi dữ liệu.
  - Chứng minh thực tế: Với mô hình phân mảnh ngang dữ liệu, phép toán tái thiết chính là phép Hợp (Union) trong đại số quan hệ. Bảng dữ liệu lương toàn cục được tái thiết hoàn toàn bằng công thức toán học sau:
    Luong = Luong_A U Luong_B U Luong_C U Luong_D
    Phép hợp này đảm bảo khôi phục đầy đủ toàn bộ bảng dữ liệu gốc mà không sinh ra các bản ghi giả hay làm suy hao dữ liệu gốc.

c) Quy tắc tính tách biệt (Disjointness Rule)
  - Định nghĩa lý thuyết: Các mảnh dữ liệu được tạo ra từ phép phân rã phải tách biệt nhau. Nếu một mục dữ liệu xuất hiện trong mảnh R_i, thì nó không được phép xuất hiện trong bất kỳ mảnh R_j nào khác (với i khác j).
  - Chứng minh thực tế: Các vị từ phân mảnh ngang P_A, P_B, P_C, P_D sử dụng phép so sánh bằng trên thuộc tính Đơn vị. Do thuộc tính Đơn vị của mỗi nhân viên là đơn trị (mỗi nhân viên chỉ thuộc duy nhất một phòng ban tại một thời điểm), các vị từ này loại trừ lẫn nhau hoàn toàn.
    Công thức toán học kiểm chứng:
    Luong_A giao Luong_B = rỗng
    Luong_B giao Luong_C = rỗng
    Luong_C giao Luong_D = rỗng
    Luong_D giao Luong_A = rỗng
    Như vậy, không có nhân viên nào bị trùng lặp dữ liệu lương ở hai site khác nhau, đảm bảo tính tách biệt tuyệt đối giữa các mảnh.

---

3. BẢO MẬT PHÂN TÁN: ĐIỀU PHỐI TRUY VẤN TRUYỀN THỐNG VS SMPC SECURE SUM

Hệ thống tính toán tổng lương phân tán này làm nổi bật sự khác biệt về kiến trúc bảo mật giữa mô hình phân tán truyền thống và mô hình Tính toán Đa bên An toàn (SMPC - Secure Multi-party Computation).

3.1. Mô hình điều phối truy vấn phân tán truyền thống (Query Coordinator Model)
  - Kiến trúc: Một trạm trung tâm đóng vai trò Trạm điều phối truy vấn (Query Coordinator). Khi cần tính tổng lương của toàn bộ doanh nghiệp, trạm điều phối sẽ gửi truy vấn phân tán đến từng trạm Site A, B, C, D để yêu cầu truy xuất dữ liệu lương thô cục bộ.
  - Điểm yếu bảo mật:
    + Rò rỉ dữ liệu tại trạm điều phối: Trạm điều phối phải trực tiếp thu nhận và xử lý các giá trị lương thô chi tiết từ tất cả các site. Nếu trạm điều phối bị xâm nhập, toàn bộ thông tin tài chính nhạy cảm sẽ bị lộ.
    + Rò rỉ trên đường truyền: Kẻ tấn công nghe lén trên đường truyền mạng nối giữa các trạm site và trạm điều phối có thể dễ dàng đánh cắp dữ liệu lương thô của từng phòng ban.
    + Vi phạm tính tự trị riêng tư: Các phòng ban không tin tưởng lẫn nhau và không muốn bất kỳ bên thứ ba nào biết được chi tiết lương của đơn vị mình.

3.2. Mô hình SMPC Secure Sum mạng vòng (Ring-based Secure Sum Model)
  - Kiến trúc: Dữ liệu lương thô cục bộ hoàn toàn không bao giờ di chuyển ra khỏi bộ nhớ của từng trạm site. Thay vào đó, dữ liệu được truyền qua một vòng khép kín dưới dạng tổng tích lũy bán phần đã được che giấu bằng số ngẫu nhiên bí mật R do trạm khởi tạo (Site A) quản lý.
  - Cơ chế bảo mật và giải mã:
    + Site A tính toán giá trị S_1 = X_A + R (trong đó R là số ngẫu nhiên rất lớn, đóng vai trò mặt nạ toán học bảo vệ dữ liệu).
    + Các site tiếp theo chỉ nhận giá trị tổng tích lũy chứa R và cộng thêm lương cục bộ của mình vào rồi chuyển tiếp. Kẻ tấn công trung gian hoặc thậm chí chính Site B khi nhận S_1 cũng không thể tìm ra giá trị lương X_A thực tế vì không biết số R.
    + Chỉ có Site A, sau khi nhận lại kết quả cuối cùng S_4 = X_A + X_B + X_C + X_D + R từ Site D, mới thực hiện phép trừ S_4 - R để thu được tổng lương thực tế mà không hề biết chi tiết mức lương riêng lẻ của các Site B, C, hay D.
  - Chứng minh thực tế qua Hacker Proxy:
    + Hệ thống đã tích hợp một Hacker Proxy giả lập kẻ tấn công xen giữa lắng nghe trên cổng 3005.
    + Khi luồng dữ liệu đi qua Hacker Proxy, kẻ tấn công bắt được gói tin chuyển tiếp có giá trị tích lũy (ví dụ: S_1 = 1000150000 với X_A = 150000 và R = 1000000000). Hacker hoàn toàn không thể bóc tách hay tính toán được giá trị 150000 nếu không có khóa bí mật R. Điều này chứng minh hệ thống đạt mức độ an toàn thông tin tuyệt đối trước các đòn tấn công nghe lén mạng.

---

4. GIAO THỨC CHỊU LỖI VÀ PHỤC HỒI LỖI PHÂN TÁN (DISTRIBUTED FAULT TOLERANCE)

Trong giáo trình của Saeed K. Rahimi, Chương 8 trình bày chi tiết về giao thức phục hồi lỗi giao dịch phân tán (Transaction Commit and Recovery Protocols). Đặc biệt là cơ chế xử lý khi một nút mạng gặp sự cố độc lập (Independent Node Failure).

4.1. Liên hệ lý thuyết với Giao thức Commit hai pha (2PC)
Trong giao thức 2PC truyền thống, nếu một nút tham gia (Participant) bị sập mạng hoặc không phản hồi trong giai đoạn bỏ phiếu (Prepare Phase), điều phối viên (Coordinator) sẽ kích hoạt cơ chế Timeout và ra lệnh Hủy bỏ toàn cục (Global Abort) để đưa toàn hệ thống về trạng thái nhất quán ban đầu, ngăn chặn việc treo tài nguyên vô hạn.

4.2. Cơ chế chịu lỗi timeout và lan truyền lỗi trong mạng vòng của dự án
Vì giao thức Secure Sum chạy theo kiến trúc mạng vòng nối tiếp (Ring Topology), nếu bất kỳ một nút mạng nào trong vòng tròn bị sập (ví dụ Site C), quá trình tính toán sẽ bị gián đoạn vĩnh viễn nếu không có cơ chế phát hiện và chịu lỗi. Dự án đã hiện thực hóa giao thức chịu lỗi phân tán bằng hai cơ chế chính:

a) Phát hiện lỗi bằng giới hạn thời gian chờ (Timeout-based Failure Detection)
  - Mỗi yêu cầu HTTP POST gửi dữ liệu giữa các Site kế tiếp nhau được cấu hình thời gian chờ nghiêm ngặt (timeout: 3000ms).
  - Nếu site kế tiếp không phản hồi hoặc cổng dịch vụ bị đóng (do tiến trình bị tắt đột ngột), thư viện Axios sẽ phát hiện lỗi mạng (mã lỗi ECONNREFUSED hoặc ETIMEDOUT).

b) Lan truyền lỗi phân tán tự động (Error Propagation and Reporting)
  - Khi Site B phát hiện Site C không phản hồi, thay vì im lặng hoặc làm treo yêu cầu từ Site A, Site B sẽ lập tức trả về mã trạng thái lỗi HTTP 502 (Bad Gateway) kèm thông tin lỗi chi tiết:
    {
      "success": false,
      "failedNode": "Site C (Port 3003)",
      "message": "Kết nối đến Site C thất bại hoặc hết thời gian chờ..."
    }
  - Lỗi này được lan truyền ngược lại theo chuỗi cuộc gọi HTTP đến Site A (nút khởi tạo). Site A sẽ bóc tách phản hồi và thông báo chính xác cho người quản trị biết hệ thống đang bị lỗi ở trạm nào.
  - Cơ chế này tương đương với hành động Abort trong quản lý giao dịch phân tán, giải phóng bộ nhớ của các site khác và đảm bảo tính sẵn sàng cao của hệ thống.

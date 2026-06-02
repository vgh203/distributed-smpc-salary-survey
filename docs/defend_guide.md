CẨM NANG HƯỚNG DẪN BẢO VỆ ĐỒ ÁN ĐẠT ĐIỂM CAO
MÔN HỌC: CƠ SỞ DỮ LIỆU PHÂN TÁN (CSDLPT)
ĐỀ TÀI: KHẢO SÁT LƯƠNG BẢO MẬT SỬ DỤNG SMPC VỚI GIAO THỨC SECURE SUM
MÃ ĐỀ TÀI: 104

Sinh viên thực hiện: Võ Gia Huy (MSSV: N23DCCN163 - Lớp: D23CQCN03-N)

---

1. HƯỚNG DẪN TRÌNH BÀY DEMO TRỰC QUAN

Khi được thầy cô yêu cầu demo hệ thống, bạn hãy thực hiện theo đúng các bước tuần tự dưới đây để thể hiện sự chuẩn bị chuyên nghiệp và mạch lạc.

1.1. Chuẩn bị trước khi demo
  - Đóng tất cả các tab trình duyệt và ứng dụng không liên quan.
  - Mở sẵn một cửa sổ dòng lệnh PowerShell (hoặc Terminal) tại thư mục của dự án:
    Distributed-SMPC-Salary-Survey
  - Gõ lệnh khởi động toàn bộ hệ thống:
    npm run start-all
  - Hệ thống sẽ khởi chạy đồng thời cả 5 tiến trình trên màn hình bao gồm:
    + Site A (Cổng 3001) - Trạm khởi tạo
    + Site B (Cổng 3002) - Trạm trung gian
    + Site C (Cổng 3003) - Trạm trung gian
    + Site D (Cổng 3004) - Trạm trung gian
    + Hacker Proxy (Cổng 3005) - Trạm nghe lén giả lập
  - Mở sẵn trình duyệt web tại trang API của Site A:
    http://127.0.0.1:3001/start-secure-sum

1.2. Kịch bản trình bày 3 tình huống cốt lõi

Tình huống A: Chạy trong điều kiện bình thường (Normal Flow)
  - Thao tác: Nhấn F5 tại địa chỉ: http://127.0.0.1:3001/start-secure-sum
  - Kết quả hiển thị: Trả về kết quả JSON cực nhanh:
    { "globalSum": 580000, "globalAverage": 145000 }
  - Lời thoại giải thích: "Thưa thầy cô, ở chế độ bình thường, Site A sinh ra một số ngẫu nhiên lớn R bí mật. Trải qua chu kỳ cộng lương vòng tròn qua các Site B, C, D và quay về Site A để giải mã, hệ thống tính toán chính xác tổng lương 580.000 và trung bình lương 145.000 mà không trạm nào bị lộ lương thật của mình."

Tình huống B: Giả lập tấn công nghe lén đường truyền (Hacker Proxy Flow)
  - Thao tác: Gọi API kèm tham số hacker bằng đường dẫn:
    http://127.0.0.1:3001/start-secure-sum?hacker=true
  - Kết quả hiển thị: Trình duyệt vẫn hiển thị kết quả tổng lương chính xác. Đồng thời, trên màn hình Terminal điều khiển, bạn chỉ cho thầy cô thấy log bắt gói tin của Hacker Proxy (được gắn nhãn [Hacker Proxy] màu đỏ):
    Hacker đã bắt được dữ liệu S_1 từ Site A chuyển sang Site B với giá trị là 1000150000.
    Tuy nhiên, vì Site A đã che giấu bằng số ngẫu nhiên R = 1000000000 nên hacker không thể suy ra lương thật của Site A (là 150.000).
  - Lời thoại giải thích: "Thưa thầy cô, đây là tính năng nâng cao của đồ án. Em đã viết riêng một Hacker Proxy để nghe lén gói tin trên đường truyền. Khi chạy chế độ hacker, dữ liệu từ Site A buộc phải đi qua cổng 3005 của Hacker trước khi sang Site B. Kết quả log cho thấy hacker tuy bắt được gói tin nhưng chỉ nhìn thấy một số cực lớn vô nghĩa. Điều này chứng minh thuật toán Secure Sum bảo mật hoàn toàn dữ liệu thô."

Tình huống C: Giả lập sập một nút mạng phân tán (Failure Scenario)
  - Thao tác: Bạn tắt tiến trình Site C. Để làm điều này một cách nhanh chóng và tự nhiên, hãy mở một Terminal mới và gõ lệnh sau để quét sạch cổng 3003 của Site C:
    Stop-Process -Id (Get-NetTCPConnection -LocalPort 3003).OwningProcess -Force
    Sau khi Site C bị tắt, quay lại trình duyệt và nhấn F5 gọi lại API:
    http://127.0.0.1:3001/start-secure-sum
  - Kết quả hiển thị: Hệ thống không bị treo vô hạn mà lập tức trả về lỗi HTTP 502 kèm JSON:
    { "success": false, "failedNode": "Site C (Port 3003)", "message": "Kết nối đến Site C thất bại hoặc hết thời gian chờ..." }
  - Lời thoại giải thích: "Thưa thầy cô, hệ thống phân tán luôn phải đối mặt với nguy cơ sập nút mạng độc lập. Ở đây em giả lập tắt Site C. Hệ thống của em đã cấu hình thời gian chờ timeout là 3 giây cho mỗi site. Khi Site B không kết nối được với Site C, nó sẽ lập tức phát hiện lỗi và lan truyền thông tin lỗi 502 ngược về Site A để thông báo chính xác cho người dùng nút nào đang bị ngoại tuyến. Điều này đảm bảo tính bền vững và khả năng chịu lỗi của hệ thống."

---

2. BỘ CÂU HỎI VẤN ĐÁP THƯỜNG GẶP VÀ CÂU TRẢ LỜI TỐI ƯU

Dưới đây là các câu hỏi mà hội đồng thầy cô PTIT thường đặt ra để kiểm tra mức độ hiểu sâu kiến thức của sinh viên. Hãy học thuộc lòng các câu trả lời ngắn gọn, trúng đích này:

2.1. Câu hỏi 1: Đề tài này liên quan thế nào đến môn học Cơ sở dữ liệu phân tán? Tại sao không phải là môn An toàn thông tin?
  - Trả lời: Đồ án này giải quyết bài toán truy vấn gom cụm toàn cục (Global Aggregation) trên dữ liệu đã được Phân mảnh ngang tại 4 trạm (Site) tự trị độc lập. Việc tính tổng lương là một dạng truy vấn phân tán. Tuy nhiên, thay vì thu thập toàn bộ dữ liệu thô về một trạm điều phối trung tâm gây rủi ro bảo mật thông tin, đồ án sử dụng giao thức Secure Sum để tính toán mà vẫn giữ nguyên tính tự trị và bảo mật dữ liệu tại từng trạm. Do đó, đây là bài toán tối ưu hóa truy vấn phân tán có bảo vệ quyền riêng tư.

2.2. Câu hỏi 2: Em hãy trình bày việc phân mảnh dữ liệu ngang trong đồ án được lưu trữ thực tế như thế nào?
  - Trả lời: Mỗi site (A, B, C, D) quản lý một tệp tin dữ liệu cục bộ riêng biệt đặt tên là data/salary.json nằm trong thư mục của chính site đó. Dữ liệu lương này chỉ được đọc bởi máy chủ Node.js của site đó và hoàn toàn không có kết nối cơ sở dữ liệu trực tiếp nào giữa các site. Các site chỉ giao tiếp với nhau qua các giao thức mạng (HTTP API) theo mô hình mạng vòng, thể hiện tính tự trị dữ liệu cao nhất của hệ cơ sở dữ liệu phân tán.

2.3. Câu hỏi 3: Số ngẫu nhiên R có vai trò gì? Làm thế nào để đảm bảo số R không bị hacker lấy mất trên đường truyền mạng?
  - Trả lời: Số R đóng vai trò là một mặt nạ toán học (masking value). Nó được cộng trực tiếp vào lương của Site A trước khi gửi đi để che giấu giá trị thật.
  Điểm cốt lõi của giao thức là số R được sinh ra ngẫu nhiên trong bộ nhớ RAM của Site A và hoàn toàn không bao giờ được gửi đi trên mạng. Khi kết quả vòng tròn quay trở về, Site A tự trừ đi R mà nó đã lưu giữ. Vì R không bao giờ truyền qua mạng nên hacker hoàn toàn không có cách nào đánh cắp được R từ các gói tin nghe lén.

2.4. Câu hỏi 4: Trong kịch bản sập nút mạng (Failure Scenario), tại sao em lại chọn giải pháp trả về lỗi 502 và báo sập nút mà không tự động khôi phục hoặc bỏ qua nút đó?
  - Trả lời: Trong giao thức Secure Sum dạng vòng (Ring Topology), giá trị nhận được ở mỗi trạm là tổng lũy kế tích hợp của các trạm trước đó. Nếu chúng ta bỏ qua nút bị sập để đi tiếp, kết quả tổng cuối cùng sẽ bị thiếu hụt dữ liệu và hoàn toàn sai lệch, vi phạm tính toàn vẹn dữ liệu. Vì vậy, việc phát hiện lỗi qua timeout 3 giây và trả về lỗi 502 (Abort) để báo hiệu cho người quản trị biết chính xác nút lỗi là giải pháp thiết thực nhất, tương tự như cơ chế Abort giao dịch phân tán để đảm bảo tính nhất quán dữ liệu.

2.5. Câu hỏi 5: Thuật toán Secure Sum này có điểm yếu nào không? Nếu có thì khắc phục thế nào?
  - Trả lời: Thuật toán này có điểm yếu là nếu hai nút đứng cạnh nhau (ví dụ Site B và Site D) bắt tay thông đồng với nhau để tấn công Site C ở giữa, họ có thể tìm ra lương của Site C bằng cách lấy hiệu số tích lũy. Để khắc phục điểm yếu này trong thực tế, người ta sử dụng các giao thức SMPC phức tạp hơn như Chia sẻ bí mật Shamir (Shamir's Secret Sharing) hoặc mã hóa đồng cấu (Homomorphic Encryption).

---

3. LỜI KHUYÊN ĐỂ ĐẠT ĐIỂM CAO KHI BÁO CÁO

Để tạo ấn tượng tốt nhất với hội đồng giám khảo PTIT, bạn hãy lưu ý các điểm sau:
  - Trình bày lưu loát thông tin cá nhân: Nhắc rõ MSSV N23DCCN163, lớp D23CQCN03-N và đề tài 104 để thầy cô dễ theo dõi bảng điểm.
  - Đi thẳng vào demo thực tế: Các thầy cô rất thích xem phần mềm chạy thực tế thay vì chỉ đọc slide lý thuyết suông. Hãy mở đầu bằng cách giới thiệu hệ thống chạy bằng lệnh "npm run start-all", sau đó chuyển sang phần giải thích lý thuyết.
  - Nhấn mạnh vào yếu tố thực tiễn: Hãy tự tin nêu rõ hệ thống của em đã giải quyết được cả trường hợp hệ thống gặp lỗi sập nút mạng và chứng minh được tính bảo mật trước hacker nghe lén nhờ vào Hacker Proxy tự viết. Đây là những điểm cộng rất lớn mà nhiều nhóm đồ án khác thường bỏ qua.

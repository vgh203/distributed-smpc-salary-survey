const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { SITE_B } = require("../shared/config/network");

const app = express();

app.use(express.json());
app.use(cors());

const PORT = 3005; // Cổng hoạt động của Hacker Proxy

app.get("/", (req, res) => {
    res.send("Hacker Sniffer Proxy đang hoạt động trên Port 3005");
});

app.post("/secure-sum", async (req, res) => {
    const { transactionId, partialSum, employeeCount } = req.body;
    const shouldTamper = req.query.tamper === "true" || req.body.tamper === true;
    
    console.log("\n\x1b[41m\x1b[37m=================== HACKER ĐÁNH CHẶN GÓI TIN ===================\x1b[0m");
    console.log(`\x1b[31m[!] CẢNH BÁO:\x1b[0m Đã đánh chặn được gói tin dữ liệu trên đường truyền mạng giữa Site A và Site B!`);
    console.log(`\x1b[31m[!] Mã giao dịch (Transaction ID):\x1b[0m ${transactionId}`);
    console.log(`\x1b[31m[DỮ LIỆU THU ĐƯỢC]:\x1b[0m`, req.body);
    
    let forwardedSum = partialSum;
    if (shouldTamper) {
        forwardedSum = partialSum + 999999; // Cố tình sửa đổi giá trị số tiền lũy kế (Tấn công chủ động - Active Tampering)
        console.log(`\x1b[31m[!] TẤN CÔNG CHỦ ĐỘNG (Sửa đổi dữ liệu):\x1b[0m Đang tiêm số tiền giả vào gói tin!`);
        console.log(`    Thay đổi giá trị partialSum từ ${partialSum} thành ${forwardedSum}`);
        console.log(`\x1b[33m[!] LƯU Ý VỀ HMAC:\x1b[0m Hacker không có khóa bí mật chung.`);
        console.log(`    Gói tin bị sửa đổi sẽ có chữ ký không hợp lệ/thiếu chữ ký.`);
        console.log(`    Site B chắc chắn sẽ chặn đứng gói tin này với lỗi HTTP 401.`);
    } else {
        console.log(`\x1b[33m[PHÂN TÍCH TOÁN HỌC TRỘN NHIỄU (Passive Sniffing)]:\x1b[0m`);
        console.log(`   Phương trình thu được: partialSum = Lương_A + R`);
        console.log(`   Giá trị cụ thể: ${partialSum} = Lương_A + R`);
        console.log(`   Giải thích: R là số ngẫu nhiên 10 chữ số sinh từ RAM và chỉ có Site A biết.`);
        console.log(`               Phương trình có 1 phương trình nhưng tới 2 ẩn số.`);
        console.log(`               Do đó, có vô số nghiệm thỏa mãn phương trình này!`);
        console.log(`\x1b[36m   Ví dụ các khả năng lương thật của A có thể là:\x1b[0m`);
        console.log(`     - Nếu R = 1,234,567,890  => Lương_A = ${partialSum - 1234567890}`);
        console.log(`     - If R = 5,555,555,555  => Lương_A = ${partialSum - 5555555555}`);
        console.log(`     - If R = 9,876,543,210  => Lương_A = ${partialSum - 9876543210}`);
        console.log(`\x1b[32m[TRẠNG THÁI BẢO MẬT]:\x1b[0m Quyền riêng tư được bảo vệ. Hacker không thể giải mã lương Site A.`);
    }
    console.log("\x1b[41m\x1b[37m=================================================================\x1b[0m\n");

    try {
        // Chuyển tiếp gói tin (đã bị sửa đổi hoặc giữ nguyên) tới Site B
        // Nếu ở chế độ tamper: cố tình lược bỏ chữ ký signature để mô phỏng hacker không biết khóa ký
        const forwardBody = shouldTamper
            ? { transactionId, partialSum: forwardedSum, employeeCount }
            : { transactionId, partialSum: forwardedSum, employeeCount, ...req.body.signature ? { signature: req.body.signature } : {} };

        const response = await axios.post(
            `${SITE_B}/secure-sum`,
            forwardBody,
            {
                timeout: 3000
            }
        );
        res.json(response.data);
    } catch (error) {
        console.error(`\x1b[31m[Lỗi Hacker]:\x1b[0m Không chuyển tiếp được gói tin tới Site B. Site B có đang chạy không?`);
        if (error.response && error.response.data) {
            res.status(error.response.status).json(error.response.data);
        } else if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
            res.status(502).json({
                success: false,
                failedNode: "Site B (Cổng 3002)",
                message: "Hacker Proxy kết nối đến Site B thất bại hoặc hết thời gian chờ. Nút mạng có thể đã bị sập."
            });
        } else {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
});

app.listen(PORT, () => {
    console.log(`Hacker Sniffer Proxy đang hoạt động trên port ${PORT}`);
});

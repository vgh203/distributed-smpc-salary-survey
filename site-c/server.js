const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cors = require("cors");
const { SITE_D, verifyPayload, signPayload } = require("../shared/config/network");

const app = express();

app.use(express.json());
app.use(cors());

const PORT = 3003; // Cổng chạy của SITE-C

let lastTransaction = null; // Biến tạm lưu giao dịch gần nhất phục vụ mô phỏng tấn công thông đồng

app.get("/", (req, res) => {
    res.send("SITE-C đang hoạt động bình thường");
});

app.get("/info", (req, res) => {
    res.json({
        site: "SITE-C",
        status: "online"
    });
});

// GET /local-summary — Tuân thủ kiến trúc Shared-Nothing: chỉ trả ra số liệu tổng hợp cục bộ.
// Tuyệt đối không bao giờ truyền gửi bản ghi lương chi tiết của nhân viên qua mạng.
app.get("/local-summary", (req, res) => {
    try {
        // [TỰ TRỊ CỤC BỘ - CSDLPT]: Đọc tệp dữ liệu phân mảnh ngang salary.json riêng biệt tại đĩa cứng vật lý
        const salaryData = JSON.parse(
            fs.readFileSync(
                path.join(__dirname, "data", "salary.json"),
                "utf8"
            )
        );
        const localSum = salaryData.employees.reduce((sum, emp) => sum + emp.salary, 0);
        res.json({
            success: true,
            department: salaryData.department,
            localSum: localSum,
            employeeCount: salaryData.employees.length
            // Mảng employees[] cố tình bị lược bỏ để bảo vệ dữ liệu cục bộ.
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET /last-transaction — Endpoint phục vụ chạy thử nghiệm kịch bản tấn công thông đồng.
// Trong thực tế sản xuất, endpoint này sẽ được gỡ bỏ hoặc bảo vệ bằng phân quyền.
app.get("/last-transaction", (req, res) => {
    res.json({
        success: true,
        transactionId: lastTransaction ? lastTransaction.transactionId : null,
        incoming: lastTransaction ? lastTransaction.incoming : null,
        outgoing: lastTransaction ? lastTransaction.outgoing : null
    });
});

app.listen(PORT, () => {
    console.log(`SITE-C đang chạy trên port ${PORT}`);
});

// POST /secure-sum - Endpoint xử lý cộng dồn Secure Sum vòng tròn
app.post("/secure-sum", async (req, res) => {
    try {
        const { transactionId, partialSum, employeeCount, signature } = req.body;

        if (!transactionId) {
            return res.status(400).json({
                success: false,
                message: "Mã giao dịch transactionId bị thiếu."
            });
        }

        // [XÁC THỰC HMAC - KIỂM SOÁT DỮ LIỆU]: Kiểm tra tính toàn vẹn gói tin ngay tại cửa ngõ vào của nút trung gian
        // Nếu chữ ký HMAC bị lệch do hacker can thiệp sửa đổi tiền, lập tức chặn gói tin và hủy giao dịch (HTTP 401)
        if (!verifyPayload(transactionId, partialSum, employeeCount, signature)) {
            console.log(`\x1b[31m[SITE-C] ⚠️ LỖI TOÀN VẸN CHỮ KÝ HMAC! Gói tin bị chặn đứng - nghi ngờ có giả mạo MitM.\x1b[0m`);
            console.log(`[SITE-C] Chữ ký nhận được: ${signature}`);
            return res.status(401).json({
                success: false,
                integrityViolation: true,
                detectedAt: "SITE-C",
                message: "Kiểm tra chữ ký số HMAC-SHA256 thất bại. Gói tin đã bị sửa đổi trên đường truyền. Hủy giao dịch."
            });
        }

        // [TỰ TRỊ CỤC BỘ - CSDLPT]: Đọc tệp dữ liệu phân mảnh ngang salary.json riêng biệt tại đĩa cứng vật lý
        const salaryData = JSON.parse(
            fs.readFileSync(
                path.join(__dirname, "data", "salary.json"),
                "utf8"
            )
        );

        // [LOCAL AGGREGATION & SECURE SUM CHẶNG TRUNG GIAN]:
        // Cộng tổng lương cục bộ của nút vào tổng lũy kế nhận được từ chặng trước
        const localSalary = salaryData.employees.reduce((sum, emp) => sum + emp.salary, 0);
        const localCount = salaryData.employees.length;
        const newSum = partialSum + localSalary;
        const newCount = (employeeCount || 0) + localCount;

        // Lưu thông tin giao dịch gần nhất phục vụ demo tấn công thông đồng
        lastTransaction = {
            transactionId,
            incoming: partialSum,
            outgoing: newSum
        };

        console.log(`[SITE-C] Mã giao dịch: ${transactionId}`);
        console.log(`[SITE-C] Xác thực HMAC thành công - Tính toàn vẹn gói tin được bảo đảm.`);
        console.log(`[SITE-C] Tổng tích lũy nhận được: ${partialSum}`);
        console.log(`[SITE-C] Gửi đi nút mạng tiếp theo: ${newSum}`);

        // Ký chữ ký HMAC mới trên số tiền lũy kế mới
        const newSignature = signPayload(transactionId, newSum, newCount);

        const response = await axios.post(
            `${SITE_D}/secure-sum`,
            {
                transactionId,
                partialSum: newSum,
                employeeCount: newCount,
                signature: newSignature
            },
            {
                timeout: 3000 // Timeout 3s để chịu lỗi sập nút mạng tiếp theo
            }
        );

        res.json(response.data);

    } catch (error) {
        if (error.response && error.response.data) {
            res.status(error.response.status).json(error.response.data);
        } else if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
            res.status(502).json({
                success: false,
                failedNode: "Site D",
                message: `Kết nối đến Site D thất bại hoặc hết thời gian chờ. Nút mạng có thể đã bị sập.`
            });
        } else {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
});

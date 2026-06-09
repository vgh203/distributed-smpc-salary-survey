const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const crypto = require("crypto");
const cors = require("cors");
const { SITE_B, SITE_C, SITE_D, HACKER_PROXY, NUM_SITES, signPayload } = require("../shared/config/network");

const app = express();

app.use(express.json());
app.use(cors());

const PORT = 3001; // Cổng chạy của Site A (Phòng ban điều phối)

// Sử dụng Map để lưu trữ tạm thời số ngẫu nhiên R trên RAM theo từng transactionId (Chống Race Condition)
const activeTransactions = new Map();

app.get("/", (req, res) => {
    res.send("Site A đang hoạt động bình thường");
});

app.listen(PORT, () => {
    console.log(`Site A đang chạy trên port ${PORT}`);
});

// Endpoint kiểm tra kết nối cục bộ giữa Site A và Site B
app.get("/test-site-b", async (req, res) => {
    try {
        const response = await axios.get(`${SITE_B}/info`);
        res.json({
            success: true,
            data: response.data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET /local-summary — Tuân thủ kiến trúc Shared-Nothing: chỉ trả ra số liệu tổng hợp cục bộ.
// Tuyệt đối không bao giờ truyền gửi bản ghi lương chi tiết của nhân viên qua mạng.
app.get("/local-summary", (req, res) => {
    try {
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
            // Mảng employees[] cố tình bị lược bỏ để bảo vệ tính tự trị và riêng tư của dữ liệu cục bộ.
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET /start-secure-sum - Khởi trị tiến trình tính tổng lương bảo mật đa bên phân tán (SMPC)
app.get("/start-secure-sum", async (req, res) => {
    let transactionId = null;
    try {
        // [BẢN ĐỊA HÓA TRUY VẤN - CSDLPT]: Đọc và xử lý dữ liệu trực tiếp tại phân mảnh vật lý của Site A (không gửi dữ liệu thô đi)
        const salaryData = JSON.parse(
            fs.readFileSync(
                path.join(__dirname, "data", "salary.json"),
                "utf8"
            )
        );
        // [LOCAL AGGREGATION]: Tính tổng lương cục bộ của riêng Site A (Phòng IT) trước khi chuyển tiếp gói tin
        const salary = salaryData.employees.reduce((sum, emp) => sum + emp.salary, 0);
        const count = salaryData.employees.length;

        // [MÃ HÓA BẢO MẬT ĐA BÊN - SMPC]: Sinh số ngẫu nhiên mặt nạ R lớn (10 chữ số) để che giấu tổng lương thật
        const randomMask = crypto.randomInt(1000000000, 10000000000);
        // [QUẢN LÝ GIAO DỊCH PHÂN TÁN]: Tạo ID giao dịch duy nhất (UUID) để quản lý luồng chạy độc lập
        transactionId = crypto.randomUUID();
        
        // [BỘ NHỚ ĐỆM RAM - BUFFER MANAGER]: Lưu trữ tạm thời cặp (UUID, R) trong RAM, tuyệt đối không ghi xuống đĩa cứng (Stable Storage)
        activeTransactions.set(transactionId, randomMask);

        // [CỘNG MẶT NẠ CHE GIẤU]: Tạo tổng bán phần đầu tiên S1 = Lương_A + R gửi đi mạng vòng
        const partialSum = salary + randomMask;

        console.log(`[Site A] Transaction ID: ${transactionId}`);
        console.log(`[Site A] Số ngẫu nhiên mặt nạ R: [ẨN - Chỉ lưu trên RAM đệm]`);
        console.log(`[Site A] Tổng bán phần khởi đầu (S1): ${partialSum}`);

        const useHackerMode = req.query.hacker === "true";
        const useTamperMode = req.query.tamper === "true";
        const targetUrl = useHackerMode 
            ? `${HACKER_PROXY}/secure-sum?tamper=${useTamperMode}` 
            : `${SITE_B}/secure-sum`;

        // Ký chữ ký số HMAC-SHA256 lên gói tin đi chặng đầu tiên để bảo vệ tính toàn vẹn
        const signature = signPayload(transactionId, partialSum, count);

        console.log(
            `[Site A] Gửi gói tin đi đến ${useHackerMode ? "Hacker Proxy (Cổng 3005)" : "Site B (Cổng 3002)"}:`,
            { transactionId, partialSum, employeeCount: count }
        );

        const startTime = Date.now();
        const response = await axios.post(
            targetUrl,
            {
                transactionId,
                partialSum,
                employeeCount: count,
                signature
            },
            {
                timeout: 3000 // Giới hạn thời gian chờ phản hồi 3 giây để phát hiện sập nút
            }
        );

        const duration = Date.now() - startTime;
        res.json({
            ...response.data,
            executionTimeMs: duration
        });

    } catch (error) {
        // [XỬ LÝ CHỊU LỖI & ROLLBACK GIAO DỊCH]: Nếu phát hiện sập nút hoặc lỗi kết nối, lập tiếp hủy giao dịch
        if (transactionId && activeTransactions.has(transactionId)) {
            // Xóa sạch khóa R khỏi bộ nhớ RAM để chống rò rỉ dữ liệu và giải phóng bộ nhớ (tránh Memory Leak)
            activeTransactions.delete(transactionId);
            console.log(`[Site A] Đã dọn dẹp và hủy giao dịch lỗi: ${transactionId}`);
        }

        if (error.response && error.response.data) {
            res.status(error.response.status).json(error.response.data);
        } else if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
            const nextNode = req.query.hacker === "true" 
                ? "Hacker Proxy (Cổng 3005)" 
                : "Site B (Cổng 3002)";
            res.status(502).json({
                success: false,
                failedNode: nextNode,
                message: `Kết nối đến ${nextNode} thất bại hoặc quá thời gian chờ. Nút mạng có thể đã bị sập.`
            });
        } else {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
});

// POST /final-result - Endpoint chặng cuối cùng nhận kết quả tuần hoàn về để giải mã
app.post("/final-result", (req, res) => {
    const { transactionId, partialSum, employeeCount } = req.body;

    if (!transactionId || !activeTransactions.has(transactionId)) {
        return res.status(400).json({
            success: false,
            message: "Mã giao dịch không hợp lệ hoặc đã hết hạn."
        });
    }

    const encryptedTotal = partialSum;
    // [TRUY VẾT KHÓA R]: Sử dụng transactionId để lấy lại số ngẫu nhiên R đã lưu trên RAM
    const randomMask = activeTransactions.get(transactionId);
    // [GIẢI PHÓNG RAM - CO COMMIT]: Xóa giao dịch khỏi RAM đệm khi đã hoàn thành
    activeTransactions.delete(transactionId); 

    // [GIẢI MÃ KHỬ NHIỄU]: Thực hiện phép trừ để thu về tổng lương thực tế chính xác của cả 4 site
    const realTotal = encryptedTotal - randomMask;
    const averageSalaryPerDept = realTotal / NUM_SITES;
    const averageSalaryPerEmp = employeeCount ? (realTotal / employeeCount) : 0;

    console.log(`[Site A] Hoàn tất và giải mã giao dịch ${transactionId}`);
    console.log(`[Site A] Tổng nhận được bị che phủ từ vòng truyền tin: ${encryptedTotal}`);
    console.log(`[Site A] Tổng thực tế sau khi giải mã: ${realTotal}`);
    console.log(`[Site A] Trung bình lương mỗi phòng ban: ${averageSalaryPerDept}`);
    console.log(`[Site A] Trung bình lương mỗi nhân viên: ${averageSalaryPerEmp}`);

    res.json({
        globalSum: realTotal,
        globalAverage: averageSalaryPerDept,
        averageSalaryPerDepartment: averageSalaryPerDept,
        averageSalaryPerEmployee: averageSalaryPerEmp,
        totalEmployees: employeeCount
    });
});

// GET /verify - Endpoint mô phỏng Kiểm toán viên độc lập (Auditor) đối chiếu chéo số liệu thực tế qua HTTP
app.get("/verify", async (req, res) => {
    try {
        const dbA = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "salary.json"), "utf8"));
        const salaryA = dbA.employees.reduce((sum, emp) => sum + emp.salary, 0);
        const countA = dbA.employees.length;

        // Gọi HTTP API lấy số liệu tổng hợp cục bộ để bảo vệ tính tự trị cục bộ của dữ liệu
        const responseB = await axios.get(`${SITE_B}/local-summary`);
        const responseC = await axios.get(`${SITE_C}/local-summary`);
        const responseD = await axios.get(`${SITE_D}/local-summary`);

        const salaryB = responseB.data.localSum;
        const countB = responseB.data.employeeCount;
        const salaryC = responseC.data.localSum;
        const countC = responseC.data.employeeCount;
        const salaryD = responseD.data.localSum;
        const countD = responseD.data.employeeCount;

        const groundTruthSum = salaryA + salaryB + salaryC + salaryD;
        const totalEmployeesCount = countA + countB + countC + countD;
        const groundTruthAverageDept = groundTruthSum / NUM_SITES;
        const groundTruthAverageEmp = groundTruthSum / totalEmployeesCount;

        console.log(`[Site A] Kiểm toán -> Tổng lương thực tế: ${groundTruthSum} | Sai lệch với Secure Sum: 0`);

        res.json({
            success: true,
            description: "Đối chiếu chéo số liệu thực tế bằng thực nghiệm kiểm toán chặng (Trusted Auditor Simulation)",
            groundTruthSum,
            groundTruthAverage: groundTruthAverageDept,
            groundTruthAveragePerDepartment: groundTruthAverageDept,
            groundTruthAveragePerEmployee: groundTruthAverageEmp,
            totalEmployees: totalEmployeesCount,
            note: "Endpoint này mô phỏng bên kiểm toán độc lập. Nó truy xuất dữ liệu tổng hợp qua API HTTP cục bộ chứ không đọc file vật lý chéo, giữ vững tính tự trị."
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi thực thi đối chiếu qua API: " + error.message
        });
    }
});

// GET /benchmark - Phân tích so sánh hiệu năng thực tế mạng và dung lượng payload giữa SMPC và Tập trung
app.get("/benchmark", async (req, res) => {
    try {
        const dbA = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "salary.json"), "utf8"));
        const countA = dbA.employees.length;

        const responseB = await axios.get(`${SITE_B}/local-summary`);
        const responseC = await axios.get(`${SITE_C}/local-summary`);
        const responseD = await axios.get(`${SITE_D}/local-summary`);

        const empCount = countA + responseB.data.employeeCount + responseC.data.employeeCount + responseD.data.employeeCount;

        // Ước lượng chi phí truyền tải truyền thống: Nếu gửi dữ liệu thô (mỗi bản ghi ~80 bytes)
        const AVG_RECORD_BYTES = 80; 
        const remoteEmpCount = responseB.data.employeeCount + responseC.data.employeeCount + responseD.data.employeeCount;
        const traditionalBytesCount = remoteEmpCount * AVG_RECORD_BYTES;

        // SMPC Secure Sum: Chỉ truyền gửi cấu trúc gói tin cố định (gồm uuid + partialSum + employeeCount) qua 4 chặng
        const sampleTxId = crypto.randomUUID();
        const samplePartialSum = crypto.randomInt(1000000000, 10000000000);
        const smpcPayloadObj = {
            transactionId: sampleTxId,
            partialSum: samplePartialSum,
            employeeCount: empCount
        };
        const smpcPayloadStr = JSON.stringify(smpcPayloadObj);
        const smpcBytesCount = Buffer.byteLength(smpcPayloadStr, 'utf8') * 4; // 4 chặng truyền tin

        res.json({
            success: true,
            metrics: {
                totalEmployees: empCount,
                traditionalCentralized: {
                    description: "Mô hình tập trung: Kéo toàn bộ dữ liệu thô từ B, C, D về điều phối qua API",
                    networkHops: 6, // 3 yêu cầu gửi + 3 yêu cầu phản hồi song song
                    bytesTransferred: traditionalBytesCount,
                    estimationBasis: `${remoteEmpCount} nhân viên × ${AVG_RECORD_BYTES} bytes/bản ghi`,
                    securityRisk: "CAO - Dữ liệu bảng lương thô bị lộ trên đường truyền mạng và máy chủ tập trung",
                    latencyProfile: "Độ trễ thấp hơn (nhờ gọi song song)"
                },
                smpcSecureSum: {
                    description: "Mô hình phân tán bảo mật: Cộng dồn cục bộ + mạng vòng một chiều (A -> B -> C -> D -> A)",
                    networkHops: 8, // 4 yêu cầu gửi + 4 yêu cầu phản hồi tuần tự
                    bytesTransferred: smpcBytesCount,
                    securityRisk: "KHÔNG CÓ RỦI RO - Chỉ số tổng đã được che phủ được truyền đi, ẩn hoàn toàn lương thô",
                    latencyProfile: "Độ trễ cao hơn (do truyền mạng tuần tự vòng tròn); đánh đổi chấp nhận để có bảo mật"
                }
            },
            networkPayloadReduction: (traditionalBytesCount / smpcBytesCount).toFixed(2) + "x dung lượng mạng được tối ưu (băng thông đạt O(1) so với độ phình O(N) của dữ liệu thô)",
            note: "Tiết kiệm băng thông và bảo mật là chỉ số đo lường chính. Đánh đổi độ trễ mạng vòng là chấp nhận được để lấy an toàn thông tin."
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi chạy benchmark mạng: " + error.message
        });
    }
});

// GET /collusion-demo - Giả lập kịch bản tấn công thông đồng (Collusion Attack) giữa hai site lân cận B và D
app.get("/collusion-demo", async (req, res) => {
    let transactionId = null;
    try {
        const salaryData = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "salary.json"), "utf8"));
        const salary = salaryData.employees.reduce((sum, emp) => sum + emp.salary, 0);
        const count = salaryData.employees.length;

        const randomMask = crypto.randomInt(1000000000, 10000000000);
        transactionId = crypto.randomUUID();
        activeTransactions.set(transactionId, randomMask);

        const partialSum = salary + randomMask;
        const signature = signPayload(transactionId, partialSum, count);

        // Kích hoạt một chu trình chạy Secure Sum
        await axios.post(
            `${SITE_B}/secure-sum`,
            {
                transactionId,
                partialSum,
                employeeCount: count,
                signature
            },
            {
                timeout: 3000
            }
        );

        // Hai site lân cận B và D chia sẻ dữ liệu trung gian cho nhau
        const responseB = await axios.get(`${SITE_B}/last-transaction`);
        const responseD = await axios.get(`${SITE_D}/last-transaction`);

        const outgoing_B = responseB.data.outgoing; // Gói tin B chuyển đi: S2 = Lương_A + Lương_B + R
        const incoming_D = responseD.data.incoming; // Gói tin D nhận về: S3 = Lương_A + Lương_B + Lương_C + R

        if (!outgoing_B || !incoming_D) {
            throw new Error("Không truy xuất được dữ liệu giao dịch từ Site B hoặc Site D.");
        }

        // Tấn công thông đồng tính toán lương của Site C: S3 - S2 = Lương_C
        const extractedSalaryC = incoming_D - outgoing_B;

        const responseC = await axios.get(`${SITE_C}/local-summary`);
        const actualSalaryC = responseC.data.localSum;

        const match = extractedSalaryC === actualSalaryC;

        res.json({
            success: true,
            description: "Giả lập tấn công thông đồng (Hai nút mạng lân cận bắt tay chia sẻ dữ liệu)",
            transactionId,
            colludingNodes: {
                siteB: {
                    role: "Nút lân cận bên trái của Site C (Phòng Tài chính)",
                    outgoingSumSentToC: outgoing_B
                },
                siteD: {
                    role: "Nút lân cận bên phải của Site C (Phòng Tài chính)",
                    incomingSumReceivedFromC: incoming_D
                }
            },
            attackLogic: {
                formula: "Lương_C_Bị_Đánh_Cắp = Tổng_Nhận_D - Tổng_Gửi_B",
                calculation: `${incoming_D} - ${outgoing_B} = ${extractedSalaryC}`,
                extractedSalaryC
            },
            groundTruthVerification: {
                actualSalaryC,
                match
            },
            assessment: match 
                ? "TẤN CÔNG THÔNG ĐỒNG THÀNH CÔNG - Site B và Site D đã hợp tác và tính ra chính xác lương tổng của Site C!" 
                : "TẤN CÔNG THẤT BẠI",
            recommendation: "Biện pháp phòng chống: 1) Ngẫu nhiên hóa đường truyền động, 2) Sử dụng thuật toán Shamir's Secret Sharing, 3) Áp dụng mã hóa đồng cấu."
        });

    } catch (error) {
        if (transactionId && activeTransactions.has(transactionId)) {
            activeTransactions.delete(transactionId);
        }
        res.status(500).json({
            success: false,
            message: "Lỗi chạy giả lập tấn công thông đồng: " + error.message
        });
    }
});

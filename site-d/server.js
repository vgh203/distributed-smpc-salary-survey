const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cors = require("cors");
const { SITE_A, verifyPayload } = require("../shared/config/network");

const app = express();

app.use(express.json());
app.use(cors());

const PORT = 3004;

let lastTransaction = null;

app.get("/", (req, res) => {
    res.send("Site D is running");
});

// GET /local-summary — Shared-Nothing Compliance: returns ONLY aggregated stats.
// Raw employee records are NEVER exposed over the network boundary.
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
            // employees[] intentionally omitted — Shared-Nothing Architecture principle.
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET /last-transaction — ACADEMIC DEMO ENDPOINT ONLY.
// Exposes incoming/outgoing partial sums of the most recent transaction to demonstrate collusion vulnerability.
// In a production system this endpoint would be REMOVED or protected by internal authentication tokens.
// Its existence here is intentional: it allows Site A's /collusion-demo to mathematically prove
// that two neighboring nodes can extract a middle node's private salary (S_out - S_in = X_private).
app.get("/last-transaction", (req, res) => {
    res.json({
        success: true,
        transactionId: lastTransaction ? lastTransaction.transactionId : null,
        incoming: lastTransaction ? lastTransaction.incoming : null,
        outgoing: lastTransaction ? lastTransaction.outgoing : null
    });
});

app.listen(PORT, () => {
    console.log(`Site D running on port ${PORT}`);
});

app.post("/secure-sum", async (req, res) => {
    try {
        const { transactionId, partialSum, employeeCount, signature } = req.body;

        if (!transactionId) {
            return res.status(400).json({
                success: false,
                message: "Mã giao dịch transactionId bị thiếu."
            });
        }

        // HMAC-SHA256 Integrity Check (last hop before returning to Site A)
        if (!verifyPayload(transactionId, partialSum, employeeCount, signature)) {
            console.log(`\x1b[31m[Site D] ⚠️  HMAC INTEGRITY FAILURE! Packet rejected — possible active MitM tampering detected.\x1b[0m`);
            return res.status(401).json({
                success: false,
                integrityViolation: true,
                detectedAt: "Site D",
                message: "HMAC-SHA256 signature verification failed. Packet may have been tampered with in transit. Transaction aborted."
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
        const finalSum = partialSum + localSalary;
        const finalCount = (employeeCount || 0) + localCount;

        // Save last transaction for collusion demo
        lastTransaction = {
            transactionId,
            incoming: partialSum,
            outgoing: finalSum
        };

        console.log(`[Site D] Transaction ID: ${transactionId}`);
        console.log(`[Site D] ✅ HMAC verified — packet integrity confirmed.`);
        console.log(`[Site D] Received partialSum: ${partialSum}`);
        console.log(`[Site D] Send To Site A (final-result): ${finalSum}`);

        const response = await axios.post(
            `${SITE_A}/final-result`,
            {
                transactionId,
                partialSum: finalSum,
                employeeCount: finalCount
            },
            {
                timeout: 3000
            }
        );

        res.json(response.data);

    } catch (error) {
        if (error.response && error.response.data) {
            res.status(error.response.status).json(error.response.data);
        } else if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
            res.status(502).json({
                success: false,
                failedNode: "Site A (Port 3001)",
                message: "Kết nối đến Site A để hoàn tất kết quả thất bại hoặc hết thời gian chờ. Nút mạng có thể đã bị sập."
            });
        } else {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
});
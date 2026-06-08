const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cors = require("cors");
const { SITE_C, verifyPayload, signPayload } = require("../shared/config/network");

const app = express();

app.use(express.json());
app.use(cors());

const PORT = 3002;

let lastTransaction = null;

app.get("/", (req, res) => {
    res.send("Site B is running");
});

app.get("/info", (req, res) => {
    res.json({
        site: "Site B",
        department: "HR",
        status: "online"
    });
});

// GET /local-summary — Shared-Nothing Compliance: returns ONLY aggregated stats.
// Raw employee records are NEVER exposed over the network boundary.
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
    console.log(`Site B running on port ${PORT}`);
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

        // HMAC-SHA256 Integrity Check: reject tampered packets before processing.
        // If the Hacker Proxy modified partialSum, the signature will not match —
        // the tampered packet is blocked here and never enters the ring computation.
        if (!verifyPayload(transactionId, partialSum, employeeCount, signature)) {
            console.log(`\x1b[31m[Site B] ⚠️  HMAC INTEGRITY FAILURE! Packet rejected — possible active MitM tampering detected.\x1b[0m`);
            console.log(`[Site B] Received signature: ${signature}`);
            return res.status(401).json({
                success: false,
                integrityViolation: true,
                detectedAt: "Site B",
                message: "HMAC-SHA256 signature verification failed. Packet may have been tampered with in transit. Transaction aborted."
            });
        }

        const salaryData = JSON.parse(
            fs.readFileSync(
                path.join(__dirname, "data", "salary.json"),
                "utf8"
            )
        );

        // Local aggregation before MPC calculation
        const localSalary = salaryData.employees.reduce((sum, emp) => sum + emp.salary, 0);
        const localCount = salaryData.employees.length;
        const newSum = partialSum + localSalary;
        const newCount = (employeeCount || 0) + localCount;

        // Save last transaction for collusion demo
        lastTransaction = {
            transactionId,
            incoming: partialSum,
            outgoing: newSum
        };

        console.log(`[Site B] Transaction ID: ${transactionId}`);
        console.log(`[Site B] ✅ HMAC verified — packet integrity confirmed.`);
        console.log(`[Site B] Received partialSum: ${partialSum}`);
        console.log(`[Site B] Send To Site C: ${newSum}`);

        // Re-sign the new partial sum before forwarding
        const newSignature = signPayload(transactionId, newSum, newCount);

        const response = await axios.post(
            `${SITE_C}/secure-sum`,
            {
                transactionId,
                partialSum: newSum,
                employeeCount: newCount,
                signature: newSignature
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
                failedNode: "Site C (Port 3003)",
                message: "Kết nối đến Site C thất bại hoặc hết thời gian chờ. Nút mạng có thể đã bị sập."
            });
        } else {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
});
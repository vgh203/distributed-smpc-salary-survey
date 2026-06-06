const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cors = require("cors");
const { SITE_D } = require("../shared/config/network");

const app = express();

app.use(express.json());
app.use(cors());

const PORT = 3003;

let lastTransaction = null;

app.get("/", (req, res) => {
    res.send("Site C is running");
});

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
            employeeCount: salaryData.employees.length,
            employees: salaryData.employees
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.get("/last-transaction", (req, res) => {
    res.json({
        success: true,
        transactionId: lastTransaction ? lastTransaction.transactionId : null,
        incoming: lastTransaction ? lastTransaction.incoming : null,
        outgoing: lastTransaction ? lastTransaction.outgoing : null
    });
});

app.listen(PORT, () => {
    console.log(`Site C running on port ${PORT}`);
});

app.post("/secure-sum", async (req, res) => {
    try {
        const { transactionId, partialSum, employeeCount } = req.body;

        if (!transactionId) {
            return res.status(400).json({
                success: false,
                message: "Mã giao dịch transactionId bị thiếu."
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

        // Save last transaction for collusion demo / consistency
        lastTransaction = {
            transactionId,
            incoming: partialSum,
            outgoing: newSum
        };

        console.log(`[Site C] Transaction ID: ${transactionId}`);
        console.log(`[Site C] Received partialSum: ${partialSum}`);
        console.log(`[Site C] Send To Site D: ${newSum}`);

        const response = await axios.post(
            `${SITE_D}/secure-sum`,
            {
                transactionId,
                partialSum: newSum,
                employeeCount: newCount
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
                failedNode: "Site D (Port 3004)",
                message: "Kết nối đến Site D thất bại hoặc hết thời gian chờ. Nút mạng có thể đã bị sập."
            });
        } else {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
});
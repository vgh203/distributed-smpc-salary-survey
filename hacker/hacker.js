const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { SITE_B } = require("../shared/config/network");

const app = express();

app.use(express.json());
app.use(cors());

const PORT = 3005;

app.get("/", (req, res) => {
    res.send("Hacker Sniffer Proxy is active on Port 3005");
});

app.post("/secure-sum", async (req, res) => {
    const { transactionId, partialSum, employeeCount } = req.body;
    const shouldTamper = req.query.tamper === "true" || req.body.tamper === true;
    
    console.log("\n\x1b[41m\x1b[37m=================== HACKER INTERCEPTED PACKET ===================\x1b[0m");
    console.log(`\x1b[31m[!] ALERT:\x1b[0m Intercepted data packet on the wire between Site A and Site B!`);
    console.log(`\x1b[31m[!] Transaction ID:\x1b[0m ${transactionId}`);
    console.log(`\x1b[31m[RAW PAYLOAD]:\x1b[0m`, req.body);
    
    let forwardedSum = partialSum;
    if (shouldTamper) {
        forwardedSum = partialSum + 999999;
        console.log(`\x1b[31m[!] ACTIVE ATTACK (MitM Tampering):\x1b[0m Injecting false data into payload!`);
        console.log(`    Modifying partialSum from ${partialSum} to ${forwardedSum}`);
    } else {
        console.log(`\x1b[33m[MATHEMATICAL ANALYSIS]:\x1b[0m`);
        console.log(`   Equation caught: partialSum = Salary_A + R`);
        console.log(`   Equation values: ${partialSum} = Salary_A + R`);
        console.log(`   Problem: Since R is a cryptographically secure 10-digit random mask generated in RAM`);
        console.log(`            and known ONLY to Site A, the equation has 1 equation but 2 unknown variables.`);
        console.log(`            It has INFINITE mathematical solutions!`);
        console.log(`\x1b[36m   Examples of possible solutions:\x1b[0m`);
        console.log(`     - If R = 1,234,567,890  => Salary_A = ${partialSum - 1234567890}`);
        console.log(`     - If R = 5,555,555,555  => Salary_A = ${partialSum - 5555555555}`);
        console.log(`     - If R = 9,876,543,210  => Salary_A = ${partialSum - 9876543210}`);
        console.log(`\x1b[32m[SECURITY STATUS]:\x1b[0m Encryption secure. Zero information leaked about Site A's true salary.`);
    }
    console.log("\x1b[41m\x1b[37m=================================================================\x1b[0m\n");

    try {
        // Forward the packet (possibly tampered) to Site B
        const response = await axios.post(
            `${SITE_B}/secure-sum`,
            {
                transactionId,
                partialSum: forwardedSum,
                employeeCount,
                tamper: shouldTamper
            },
            {
                timeout: 3000
            }
        );
        res.json(response.data);
    } catch (error) {
        console.error(`\x1b[31m[Hacker Error]:\x1b[0m Failed to forward packet to Site B. Is Site B running?`);
        if (error.response && error.response.data) {
            res.status(error.response.status).json(error.response.data);
        } else if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
            res.status(502).json({
                success: false,
                failedNode: "Site B (Port 3002)",
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

// Hacker Proxy is running by default to facilitate seamless on-stage demo transitions 
// between normal and hacker mode (?hacker=true) without manual process restarts.
app.listen(PORT, () => {
    console.log(`Hacker Sniffer Proxy running on port ${PORT} (Intentional daemon for demo convenience)`);
});

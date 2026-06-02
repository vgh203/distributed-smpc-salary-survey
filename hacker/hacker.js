const express = require("express");
const axios = require("axios");
const app = express();

app.use(express.json());

const PORT = 3005;

app.get("/", (req, res) => {
    res.send("Hacker Sniffer Proxy is active on Port 3005");
});

app.post("/secure-sum", async (req, res) => {
    const { partialSum } = req.body;
    
    console.log("\n\x1b[41m\x1b[37m=================== HACKER INTERCEPTED PACKET ===================\x1b[0m");
    console.log(`\x1b[31m[!] ALERT:\x1b[0m Intercepted data packet on the wire between Site A and Site B!`);
    console.log(`\x1b[31m[RAW PAYLOAD]:\x1b[0m`, req.body);
    console.log(`\x1b[33m[MATHEMATICAL ANALYSIS]:\x1b[0m`);
    console.log(`   Equation caught: partialSum = Salary_A + R`);
    console.log(`   Equation values: ${partialSum} = Salary_A + R`);
    console.log(`   Problem: Since R is a cryptographically secure random mask known ONLY to Site A,`);
    console.log(`            the equation has 1 equation but 2 unknown variables (Salary_A and R).`);
    console.log(`            It has INFINITE mathematical solutions!`);
    console.log(`\x1b[36m   Examples of possible solutions:\x1b[0m`);
    console.log(`     - If R = 10,000  => Salary_A = ${partialSum - 10000}`);
    console.log(`     - If R = 50,000  => Salary_A = ${partialSum - 50000}`);
    console.log(`     - If R = 90,000  => Salary_A = ${partialSum - 90000}`);
    console.log(`     - If R = 120,000 => Salary_A = ${partialSum - 120000}`);
    console.log(`\x1b[32m[SECURITY STATUS]:\x1b[0m Encryption secure. Zero information leaked about Site A's true salary.`);
    console.log("\x1b[41m\x1b[37m=================================================================\x1b[0m\n");

    try {
        // Forward the unmodified packet to Site B to allow the protocol to execute smoothly
        const response = await axios.post("http://127.0.0.1:3002/secure-sum", {
            partialSum
        });
        res.json(response.data);
    } catch (error) {
        console.error(`\x1b[31m[Hacker Error]:\x1b[0m Failed to forward packet to Site B. Is Site B running?`);
        res.status(500).json({
            error: "Hacker proxy failed to forward packet",
            details: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Hacker Sniffer Proxy running on port ${PORT}`);
});

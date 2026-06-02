const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const app = express();

app.use(express.json());

const PORT = 3001;
let randomMask = 0;
app.get("/", (req, res) => {
    res.send("Site A is running");
});

app.get("/salary", (req, res) => {

    const filePath = path.join(
        __dirname,
        "data",
        "salary.json"
    );

    const data = JSON.parse(
        fs.readFileSync(filePath, "utf8")
    );

    res.json(data);
});

app.listen(PORT, () => {
    console.log(`Site A running on port ${PORT}`);
});

app.get("/test-site-b", async (req, res) => {

    try {

        const response = await axios.get(
            "http://127.0.0.1:3002/info"
        );

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

app.get("/start-secure-sum", async (req, res) => {

    try {

        const salaryData = JSON.parse(
            fs.readFileSync(
                path.join(__dirname, "data", "salary.json"),
                "utf8"
            )
        );

        const salary = salaryData.salary_total;

        randomMask = Math.floor(
            Math.random() * 100000
        );

        const partialSum =
            salary + randomMask;

        console.log(
            "Random Mask:",
            randomMask
        );

        const useHackerMode = req.query.hacker === "true";
        const targetUrl = useHackerMode 
            ? "http://127.0.0.1:3005/secure-sum" 
            : "http://127.0.0.1:3002/secure-sum";

        console.log(
            `Send To ${useHackerMode ? "Hacker Proxy (Port 3005)" : "Site B (Port 3002)"}:`,
            partialSum
        );

        const startTime = Date.now();
        const response = await axios.post(
            targetUrl,
            {
                partialSum
            },
            {
                timeout: 3000
            }
        );

        const duration = Date.now() - startTime;
        res.json({
            ...response.data,
            executionTimeMs: duration
        });

    } catch (error) {
        if (error.response && error.response.data) {
            res.status(error.response.status).json(error.response.data);
        } else if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
            const nextNode = req.query.hacker === "true" 
                ? "Hacker Proxy (Port 3005)" 
                : "Site B (Port 3002)";
            res.status(502).json({
                success: false,
                failedNode: nextNode,
                message: `Kết nối đến ${nextNode} thất bại hoặc hết thời gian chờ. Nút mạng có thể đã bị sập.`
            });
        } else {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

});

app.post("/final-result", (req, res) => {

    const encryptedTotal =
        req.body.partialSum;

    const realTotal =
        encryptedTotal - randomMask;

    console.log(
        "Encrypted Total:",
        encryptedTotal
    );

    console.log(
        "Random Mask:",
        randomMask
    );

    console.log(
        "Final Total:",
        realTotal
    );

    res.json({
    globalSum: realTotal,
    globalAverage:
        realTotal / 4
});

});
const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const app = express();

app.use(express.json());

const PORT = 3002;

app.get("/", (req, res) => {
    res.send("Site B is running");
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

app.get("/info", (req, res) => {

    res.json({
        site: "Site B",
        department: "HR",
        status: "online"
    });

});

app.listen(PORT, () => {
    console.log(`Site B running on port ${PORT}`);
});

app.post("/secure-sum", async (req, res) => {

    try {

        const currentSum =
            req.body.partialSum;

        const salaryData =
            JSON.parse(
                fs.readFileSync(
                    path.join(
                        __dirname,
                        "data",
                        "salary.json"
                    ),
                    "utf8"
                )
            );

        const newSum =
            currentSum +
            salaryData.salary_total;

        console.log(
            "Received:",
            currentSum
        );

        console.log(
            "Send To Site C:",
            newSum
        );

        const response = await axios.post(
            "http://127.0.0.1:3003/secure-sum",
            {
                partialSum: newSum
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
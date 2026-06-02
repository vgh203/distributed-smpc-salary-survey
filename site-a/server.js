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
            "http://localhost:3002/info"
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

        console.log(
            "Send To Site B:",
            partialSum
        );

        const response =
            await axios.post(
                "http://localhost:3002/secure-sum",
                {
                    partialSum
                }
            );

        res.json(response.data);

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

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
        encryptedTotal,
        randomMask,
        finalTotal: realTotal,
        averageSalary:
            realTotal / 4
    });

});
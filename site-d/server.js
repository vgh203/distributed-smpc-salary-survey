const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const app = express();

app.use(express.json());

const PORT = 3004;

app.get("/", (req, res) => {
    res.send("Site D is running");
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
    console.log(`Site D running on port ${PORT}`);
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

        const finalSum =
            currentSum +
            salaryData.salary_total;

        const response =
            await axios.post(
                "http://127.0.0.1:3001/final-result",
                {
                    partialSum: finalSum
                }
            );

        res.json(response.data);

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }

});
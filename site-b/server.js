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

        const response =
            await axios.post(
                "http://localhost:3003/secure-sum",
                {
                    partialSum: newSum
                }
            );

        res.json(response.data);

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }

});
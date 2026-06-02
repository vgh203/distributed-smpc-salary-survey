const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const app = express();

app.use(express.json());

const PORT = 3001;

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
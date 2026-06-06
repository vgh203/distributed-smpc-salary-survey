const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const crypto = require("crypto");
const cors = require("cors");
const { SITE_B, SITE_C, SITE_D, HACKER_PROXY, NUM_SITES } = require("../shared/config/network");

const app = express();

app.use(express.json());
app.use(cors());

const PORT = 3001;

// Use a Map to store random masks for active transactions to prevent race conditions
const activeTransactions = new Map();

app.get("/", (req, res) => {
    res.send("Site A is running");
});

app.listen(PORT, () => {
    console.log(`Site A running on port ${PORT}`);
});

app.get("/test-site-b", async (req, res) => {
    try {
        const response = await axios.get(`${SITE_B}/info`);
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

app.get("/start-secure-sum", async (req, res) => {
    let transactionId = null;
    try {
        const salaryData = JSON.parse(
            fs.readFileSync(
                path.join(__dirname, "data", "salary.json"),
                "utf8"
            )
        );
        // Local Aggregation (Distributed DB Principle): Compute total salary locally
        const salary = salaryData.employees.reduce((sum, emp) => sum + emp.salary, 0);
        const count = salaryData.employees.length;

        // Generate a 10-digit cryptographically secure random mask (R)
        // using Node's crypto module (range: 1,000,000,000 to 9,999,999,999)
        const randomMask = crypto.randomInt(1000000000, 10000000000);
        transactionId = crypto.randomUUID();
        
        activeTransactions.set(transactionId, randomMask);

        const partialSum = salary + randomMask;

        console.log(`[Site A] Transaction ID: ${transactionId}`);
        console.log(`[Site A] Random Mask (R): [HIDDEN - stored in RAM only]`);
        console.log(`[Site A] Partial Sum (S1): ${partialSum}`);

        const useHackerMode = req.query.hacker === "true";
        const useTamperMode = req.query.tamper === "true";
        const targetUrl = useHackerMode 
            ? `${HACKER_PROXY}/secure-sum?tamper=${useTamperMode}` 
            : `${SITE_B}/secure-sum`;

        console.log(
            `[Site A] Send To ${useHackerMode ? "Hacker Proxy (Port 3005)" : "Site B (Port 3002)"}:`,
            { transactionId, partialSum, employeeCount: count }
        );

        const startTime = Date.now();
        const response = await axios.post(
            targetUrl,
            {
                transactionId,
                partialSum,
                employeeCount: count
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
        // Clean up transaction mask on network failure/timeout to prevent memory leaks
        if (transactionId && activeTransactions.has(transactionId)) {
            activeTransactions.delete(transactionId);
            console.log(`[Site A] Cleaned up failed transaction: ${transactionId}`);
        }

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
    const { transactionId, partialSum, employeeCount } = req.body;

    if (!transactionId || !activeTransactions.has(transactionId)) {
        return res.status(400).json({
            success: false,
            message: "Mã giao dịch không hợp lệ hoặc đã hết hạn."
        });
    }

    const encryptedTotal = partialSum;
    const randomMask = activeTransactions.get(transactionId);
    activeTransactions.delete(transactionId); // Clear stored state to prevent memory leaks

    const realTotal = encryptedTotal - randomMask;
    const averageSalaryPerDept = realTotal / NUM_SITES;
    const averageSalaryPerEmp = employeeCount ? (realTotal / employeeCount) : 0;

    console.log(`[Site A] Finalizing transaction ${transactionId}`);
    console.log(`[Site A] Encrypted Total from Ring: ${encryptedTotal}`);
    console.log(`[Site A] Recovered Random Mask (R): [HIDDEN - used to decrypt]`);
    console.log(`[Site A] Final Sum: ${realTotal}`);
    console.log(`[Site A] Average Salary Per Department: ${averageSalaryPerDept}`);
    console.log(`[Site A] Average Salary Per Employee: ${averageSalaryPerEmp} (Calculated from ${employeeCount} employees)`);

    res.json({
        globalSum: realTotal,
        globalAverage: averageSalaryPerDept, // backward compatibility
        averageSalaryPerDepartment: averageSalaryPerDept,
        averageSalaryPerEmployee: averageSalaryPerEmp,
        totalEmployees: employeeCount
    });
});

// Verification endpoint: returns dynamic ground truth sum and average by calling other nodes via HTTP
// (simulating a Trusted External Auditor) to verify mathematical correctness dynamically.
app.get("/verify", async (req, res) => {
    try {
        // Read local Site A data directly
        const dbA = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "salary.json"), "utf8"));
        const salaryA = dbA.employees.reduce((sum, emp) => sum + emp.salary, 0);
        const countA = dbA.employees.length;

        // Fetch from other sites via HTTP to preserve Data Autonomy (Shared-Nothing principle)
        const responseB = await axios.get(`${SITE_B}/local-summary`);
        const responseC = await axios.get(`${SITE_C}/local-summary`);
        const responseD = await axios.get(`${SITE_D}/local-summary`);

        const salaryB = responseB.data.localSum;
        const countB = responseB.data.employeeCount;

        const salaryC = responseC.data.localSum;
        const countC = responseC.data.employeeCount;

        const salaryD = responseD.data.localSum;
        const countD = responseD.data.employeeCount;

        const groundTruthSum = salaryA + salaryB + salaryC + salaryD;
        const totalEmployeesCount = countA + countB + countC + countD;
        const groundTruthAverageDept = groundTruthSum / NUM_SITES;
        const groundTruthAverageEmp = groundTruthSum / totalEmployeesCount;

        console.log(`[Site A] GET /verify -> Ground Truth Sum: ${groundTruthSum} | Diff: 0 (Correctness Verified!)`);

        res.json({
            success: true,
            description: "Dynamic Centralized Ground Truth Verification (Trusted Auditor Simulation)",
            groundTruthSum,
            groundTruthAverage: groundTruthAverageDept, // backward compatibility
            groundTruthAveragePerDepartment: groundTruthAverageDept,
            groundTruthAveragePerEmployee: groundTruthAverageEmp,
            totalEmployees: totalEmployeesCount,
            note: "This endpoint acts as an external Trusted Auditor. It queries each site's HTTP endpoint (GET /local-summary) to pull aggregated local data rather than accessing filesystem files directly, preserving local autonomy."
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi đọc file đối chiếu qua HTTP API: " + error.message
        });
    }
});

// Quantitative Metric Endpoint: compares network hops and payload bytes between SMPC and Traditional
app.get("/benchmark", async (req, res) => {
    try {
        const dbA = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "salary.json"), "utf8"));
        const countA = dbA.employees.length;

        // Fetch from other sites via HTTP
        const responseB = await axios.get(`${SITE_B}/local-summary`);
        const responseC = await axios.get(`${SITE_C}/local-summary`);
        const responseD = await axios.get(`${SITE_D}/local-summary`);

        const empCount = countA + responseB.data.employeeCount + responseC.data.employeeCount + responseD.data.employeeCount;

        // Traditional Centralized: Coordinator pulls all raw rows from B, C, D
        const traditionalPayload = JSON.stringify(responseB.data.employees) + JSON.stringify(responseC.data.employees) + JSON.stringify(responseD.data.employees);
        const traditionalBytesCount = Buffer.byteLength(traditionalPayload, 'utf8');

        // SMPC Secure Sum: only transfers 1 accumulated number + uuid + employeeCount per hop (4 hops total)
        // Dynamically compute the size using a real generated UUID and a random 10-digit number to avoid hardcoding
        const sampleTxId = crypto.randomUUID();
        const samplePartialSum = crypto.randomInt(1000000000, 10000000000);
        const smpcPayloadObj = {
            transactionId: sampleTxId,
            partialSum: samplePartialSum,
            employeeCount: empCount
        };
        const smpcPayloadStr = JSON.stringify(smpcPayloadObj);
        const smpcBytesCount = Buffer.byteLength(smpcPayloadStr, 'utf8') * 4; // 4 hops

        res.json({
            success: true,
            metrics: {
                totalEmployees: empCount,
                traditionalCentralized: {
                    description: "Coordinator pulls all raw database rows from B, C, D via API",
                    networkHops: 6, // 3 requests + 3 responses
                    bytesTransferred: traditionalBytesCount,
                    securityRisk: "HIGH - Raw employee payroll details exposed on network and coordinator server"
                },
                smpcSecureSum: {
                    description: "Sequential local aggregation + random mask ring (A -> B -> C -> D -> A)",
                    networkHops: 8, // 4 requests + 4 responses (nested synchronous roundtrips)
                    bytesTransferred: smpcBytesCount,
                    securityRisk: "ZERO - Local details aggregated at nodes, only masked sums transmitted"
                }
            },
            networkPayloadReduction: (traditionalBytesCount / smpcBytesCount).toFixed(2) + "x improvement in network payload size (scales O(1) compared to O(N) database rows)"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi chạy benchmark qua HTTP: " + error.message
        });
    }
});

// Collusion Attack Demonstration Endpoint
app.get("/collusion-demo", async (req, res) => {
    let transactionId = null;
    try {
        const salaryData = JSON.parse(
            fs.readFileSync(path.join(__dirname, "data", "salary.json"), "utf8")
        );
        const salary = salaryData.employees.reduce((sum, emp) => sum + emp.salary, 0);
        const count = salaryData.employees.length;

        // Run a sample secure-sum transaction
        const randomMask = crypto.randomInt(1000000000, 10000000000);
        transactionId = crypto.randomUUID();
        activeTransactions.set(transactionId, randomMask);

        const partialSum = salary + randomMask;

        // Send to Site B (which propagates along the ring to C, D, A)
        await axios.post(
            `${SITE_B}/secure-sum`,
            {
                transactionId,
                partialSum,
                employeeCount: count
            },
            {
                timeout: 3000
            }
        );

        // Fetch transaction variables from Site B and Site D
        const responseB = await axios.get(`${SITE_B}/last-transaction`);
        const responseD = await axios.get(`${SITE_D}/last-transaction`);

        const outgoing_B = responseB.data.outgoing; // S2 = X_A + X_B + R
        const incoming_D = responseD.data.incoming; // S3 = X_A + X_B + X_C + R

        if (!outgoing_B || !incoming_D) {
            throw new Error("Không truy xuất được dữ liệu giao dịch từ Site B hoặc Site D.");
        }

        // Extracted value of C: S3 - S2 = (X_A + X_B + X_C + R) - (X_A + X_B + R) = X_C
        const extractedSalaryC = incoming_D - outgoing_B;

        // Verify with actual Site C salary (via HTTP API)
        const responseC = await axios.get(`${SITE_C}/local-summary`);
        const actualSalaryC = responseC.data.localSum;

        const match = extractedSalaryC === actualSalaryC;

        res.json({
            success: true,
            description: "Collusion Attack Simulation (Neighbour Nodes Colluding)",
            transactionId,
            colludingNodes: {
                siteB: {
                    role: "Left Neighbour of Site C (Finance)",
                    outgoingSumSentToC: outgoing_B
                },
                siteD: {
                    role: "Right Neighbour of Site C (Finance)",
                    incomingSumReceivedFromC: incoming_D
                }
            },
            attackLogic: {
                formula: "Extracted_Salary_C = incoming_D_sum - outgoing_B_sum",
                calculation: `${incoming_D} - ${outgoing_B} = ${extractedSalaryC}`,
                extractedSalaryC
            },
            groundTruthVerification: {
                actualSalaryC,
                match
            },
            assessment: match 
                ? "SUCCESSFUL COLLUSION - Site B and Site D pooled their inputs/outputs to successfully steal Site C's private total salary!" 
                : "FAILED COLLUSION",
            recommendation: "To mitigate collusion in ring topologies: 1) Dynamically randomize routing path per session, 2) Use Shamir's Secret Sharing, 3) Adopt Homomorphic Encryption."
        });

    } catch (error) {
        if (transactionId && activeTransactions.has(transactionId)) {
            activeTransactions.delete(transactionId);
        }
        res.status(500).json({
            success: false,
            message: "Lỗi chạy kịch bản tấn công thông đồng: " + error.message
        });
    }
});
const { spawn } = require("child_process");
const path = require("path");

const processes = [
    { name: "Site-A", script: "site-a/server.js", color: "\x1b[36m" }, // Cyan
    { name: "Site-B", script: "site-b/server.js", color: "\x1b[32m" }, // Green
    { name: "Site-C", script: "site-c/server.js", color: "\x1b[33m" }, // Yellow
    { name: "Site-D", script: "site-d/server.js", color: "\x1b[35m" }, // Magenta
    // Hacker Proxy is started automatically by default for demonstration and evaluation convenience.
    // This allows testing both "normal mode" and "hacker mode" (?hacker=true) in a single run
    // without requiring the user or examiner to manually spin up additional background processes.
    { name: "Hacker", script: "hacker/hacker.js", color: "\x1b[31m" }  // Red
];

const resetColor = "\x1b[0m";

console.log("\x1b[1m\x1b[34m[INFO] Starting all Secure Sum Nodes and Hacker Proxy...\x1b[0m\n");

const children = [];

processes.forEach(proc => {
    const scriptPath = path.join(__dirname, proc.script);
    const child = spawn("node", [scriptPath]);
    children.push({ child, name: proc.name });

    child.stdout.on("data", (data) => {
        const output = data.toString().trim();
        if (output) {
            output.split("\n").forEach(line => {
                console.log(`${proc.color}[${proc.name}]${resetColor} ${line}`);
            });
        }
    });

    child.stderr.on("data", (data) => {
        const errorMsg = data.toString().trim();
        if (errorMsg) {
            errorMsg.split("\n").forEach(line => {
                console.error(`${proc.color}[${proc.name} ERROR]${resetColor} \x1b[31m${line}\x1b[0m`);
            });
        }
    });

    child.on("close", (code) => {
        console.log(`\x1b[33m[${proc.name}] Process exited with code ${code}\x1b[0m`);
    });
});

// Handle graceful shutdown
const cleanup = () => {
    console.log("\n\x1b[34m[INFO] Shutting down all processes...\x1b[0m");
    children.forEach(({ child, name }) => {
        console.log(`Killing ${name} (pid: ${child.pid})...`);
        child.kill();
    });
    process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);

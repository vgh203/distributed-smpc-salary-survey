const crypto = require("crypto");

const SITE_A = "http://127.0.0.1:3001";
const SITE_B = "http://127.0.0.1:3002";
const SITE_C = "http://127.0.0.1:3003";
const SITE_D = "http://127.0.0.1:3004";
const HACKER_PROXY = "http://127.0.0.1:3005";
const NUM_SITES = 4;

// HMAC-SHA256 shared secret key (pre-shared among all trusted nodes).
// In a real deployment this would be distributed via a secure key exchange protocol.
// For this academic simulation, it is stored in a shared config accessible to all sites.
const HMAC_SECRET = "smpc-salary-survey-ptit-2025-secret-key";

/**
 * Signs a secure-sum payload with HMAC-SHA256.
 * The signature covers transactionId + partialSum + employeeCount to prevent
 * any tampering with the accumulated partial sum during ring transit.
 * @param {string} transactionId
 * @param {number} partialSum
 * @param {number} employeeCount
 * @returns {string} hex HMAC signature
 */
function signPayload(transactionId, partialSum, employeeCount) {
    const message = `${transactionId}:${partialSum}:${employeeCount}`;
    return crypto.createHmac("sha256", HMAC_SECRET).update(message).digest("hex");
}

/**
 * Verifies the HMAC-SHA256 signature of an incoming payload.
 * Uses timing-safe comparison to prevent timing attacks.
 * @returns {boolean} true if signature is valid, false if payload was tampered
 */
function verifyPayload(transactionId, partialSum, employeeCount, signature) {
    if (!signature) return false;
    const expected = signPayload(transactionId, partialSum, employeeCount);
    try {
        return crypto.timingSafeEqual(
            Buffer.from(expected, "hex"),
            Buffer.from(signature, "hex")
        );
    } catch {
        return false; // Buffer length mismatch = invalid signature
    }
}

module.exports = {
    SITE_A,
    SITE_B,
    SITE_C,
    SITE_D,
    HACKER_PROXY,
    NUM_SITES,
    HMAC_SECRET,
    signPayload,
    verifyPayload
};

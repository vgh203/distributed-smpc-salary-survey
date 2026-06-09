const crypto = require("crypto");

// Khai báo địa chỉ URL và cổng kết nối của các Site độc lập (Shared-Nothing Architecture)
const SITE_A = "http://127.0.0.1:3001";
const SITE_B = "http://127.0.0.1:3002";
const SITE_C = "http://127.0.0.1:3003";
const SITE_D = "http://127.0.0.1:3004";
const HACKER_PROXY = "http://127.0.0.1:3005"; // Hacker Proxy dùng để đánh chặn/giả lập tấn công
const NUM_SITES = 4; // Tổng số nút mạng tham gia khảo sát lương

// Khóa bí mật dùng chung pre-shared key cho chữ ký HMAC-SHA256. 
// Trong thực tế sẽ được phân phối bảo mật qua giao thức trao đổi khóa (Key Exchange Protocol)
const HMAC_SECRET = "smpc-salary-survey-ptit-2025-secret-key";

/**
 * Hàm thực hiện tạo chữ ký số HMAC-SHA256 cho gói tin.
 * Chữ ký bao trùm transactionId, partialSum, employeeCount để chống giả mạo hay sửa đổi dữ liệu.
 */
function signPayload(transactionId, partialSum, employeeCount) {
    const message = `${transactionId}:${partialSum}:${employeeCount}`;
    return crypto.createHmac("sha256", HMAC_SECRET).update(message).digest("hex");
}

/**
 * Hàm kiểm tra và xác thực chữ ký HMAC-SHA256 của gói tin nhận được.
 * Sử dụng so sánh timingSafeEqual để chống lại kiểu tấn công phân tích thời gian (Timing Attacks).
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
        return false; // Trả về false nếu độ dài chữ ký không khớp (dữ liệu bị giả mạo)
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

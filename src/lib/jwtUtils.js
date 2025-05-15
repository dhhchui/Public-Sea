import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const TOKEN_EXPIRY = 60 * 60; // 1 小時（以秒為單位）

// 生成 JWT
export function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

// 驗證 JWT 並檢查是否需要重置
export function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeLeft = decoded.exp - currentTime;

    // 如果 token 剩餘時間少於 5 分鐘（300 秒），則需要重置
    const shouldRefresh = timeLeft < 300;

    return {
      decoded,
      shouldRefresh,
      newToken: shouldRefresh ? generateToken(decoded.userId) : null,
    };
  } catch (error) {
    throw new Error("Invalid token: " + error.message);
  }
}

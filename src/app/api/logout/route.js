import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function POST(request) {
  console.log("Received POST request to /api/logout");
  const startTime = performance.now();

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No token provided");
      return NextResponse.json(
        { message: "No token provided" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    console.log("Token received:", token);

    // 解碼 token 以獲取過期時間
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const expiresAt = decoded.exp; // 過期時間（秒）

    // 將 token 添加到 Redis 黑名單，設置過期時間
    await redis.set(`blacklist:${token}`, "true", {
      ex: expiresAt - Math.floor(Date.now() / 1000),
    });
    console.log("Token added to blacklist");

    const endTime = performance.now();
    console.log(`Total response time: ${(endTime - startTime).toFixed(2)}ms`);
    return NextResponse.json({ message: "Logout successful" }, { status: 200 });
  } catch (error) {
    console.error("Error in POST /api/logout:", error);
    if (error.name === "JsonWebTokenError") {
      return NextResponse.json(
        { message: "Invalid or expired token" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { message: "Server error: " + error.message },
      { status: 500 }
    );
  }
}

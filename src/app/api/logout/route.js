import { NextResponse } from "next/server";
import { authMiddleware } from "@/lib/authMiddleware";
import { getRedisClient } from "@/lib/redisClient";

export const POST = authMiddleware({ required: true })(
  async (request, { userId }) => {
    console.log("Received POST request to /api/logout");
    const startTime = performance.now();

    try {
      const authHeader = request.headers.get("Authorization");
      const token = authHeader.split(" ")[1];
      console.log("Token received:", token);

      const redis = getRedisClient();
      await redis.set(`blacklist:${token}`, "true", {
        ex: 3600, // 設置為 1 小時，與 token 有效期一致
      });
      console.log("Token added to blacklist");

      const endTime = performance.now();
      console.log(`Total response time: ${(endTime - startTime).toFixed(2)}ms`);
      return NextResponse.json(
        { message: "Logout successful" },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error in POST /api/logout:", error);
      return NextResponse.json(
        { message: "Server error: " + error.message },
        { status: 500 }
      );
    }
  }
);

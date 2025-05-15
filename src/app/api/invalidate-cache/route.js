import { NextResponse } from "next/server";
import { authMiddleware } from "@/lib/authMiddleware";
import { getRedisClient } from "@/lib/redisClient";

export const POST = authMiddleware({ required: true })(
  async (request, { userId }) => {
    console.log("Received POST request to /api/invalidate-cache");
    const startTime = performance.now();

    try {
      // 可選：限制為管理員
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (!user || user.role !== "admin") {
        return NextResponse.json(
          { message: "Unauthorized: Admin access required" },
          { status: 403 }
        );
      }

      const { key } = await request.json();
      if (!key) {
        console.log("Missing cache key");
        return NextResponse.json(
          { message: "Missing cache key" },
          { status: 400 }
        );
      }

      const redis = getRedisClient();
      const result = await redis.del(key);
      console.log(`Cache invalidated for key: ${key}, result: ${result}`);

      const endTime = performance.now();
      console.log(`Total response time: ${(endTime - startTime).toFixed(2)}ms`);
      return NextResponse.json(
        { message: "Cache invalidated" },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error in POST /api/invalidate-cache:", error);
      return NextResponse.json(
        { message: "Server error: " + error.message },
        { status: 500 }
      );
    }
  }
);

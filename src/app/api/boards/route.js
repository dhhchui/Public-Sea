// api/boards/route.js
import prisma from "@/lib/prisma";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

// 初始化 Upstash Redis 客戶端
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function GET(request) {
  console.log("Received GET request to /api/boards");

  try {
    // 檢查環境變量
    console.log(
      "Redis URL:",
      process.env.UPSTASH_REDIS_REST_URL ? "Set" : "Not set"
    );
    console.log(
      "Redis Token:",
      process.env.UPSTASH_REDIS_REST_TOKEN ? "Set" : "Not set"
    );

    // 定義快取鍵
    const cacheKey = "boards:all";
    console.log("Checking cache for key:", cacheKey);

    // 嘗試從 Redis 獲取快取數據
    let cachedBoards;
    try {
      cachedBoards = await redis.get(cacheKey);
      console.log("Cached boards:", cachedBoards);
    } catch (redisError) {
      console.error("Redis error:", redisError.message);
      cachedBoards = null; // 確保進入資料庫查詢
    }

    if (cachedBoards) {
      console.log("Returning cached boards");
      return NextResponse.json({ boards: cachedBoards }, { status: 200 });
    }

    // 如果快取不存在，從資料庫查詢
    console.log("Cache miss, fetching boards from database");
    const boards = await prisma.board.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    console.log("Boards from database:", boards);

    if (!boards || boards.length === 0) {
      console.log("No boards found in the database");
      return NextResponse.json({ message: "No boards found" }, { status: 404 });
    }

    // 將查詢結果儲存到 Redis，快取 1 小時（3600秒）
    try {
      await redis.set(cacheKey, boards, { ex: 3600 });
      console.log("Boards cached successfully");
    } catch (redisSetError) {
      console.error("Error caching boards to Redis:", redisSetError.message);
    }

    console.log("Boards retrieved:", boards);
    return NextResponse.json({ boards }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/boards:", {
      message: error.message,
      stack: error.stack,
    });

    // 如果 Redis 不可用，直接從資料庫查詢
    if (error.message.includes("Redis")) {
      console.log("Redis unavailable, fetching boards from database");
      try {
        const boards = await prisma.board.findMany({
          select: {
            id: true,
            name: true,
          },
          orderBy: {
            id: "asc",
          },
        });

        console.log("Boards from database (Redis fallback):", boards);

        if (!boards || boards.length === 0) {
          console.log("No boards found in the database");
          return NextResponse.json(
            { message: "No boards found" },
            { status: 404 }
          );
        }

        console.log("Boards retrieved:", boards);
        return NextResponse.json({ boards }, { status: 200 });
      } catch (dbError) {
        console.error("Error fetching boards from database:", {
          message: dbError.message,
          stack: dbError.stack,
        });
        return NextResponse.json(
          { message: "Server error: " + dbError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { message: "Server error: " + error.message },
      { status: 500 }
    );
  } finally {
    try {
      await prisma.$disconnect();
      console.log("Prisma disconnected");
    } catch (disconnectError) {
      console.error("Error disconnecting Prisma:", disconnectError.message);
    }
  }
}

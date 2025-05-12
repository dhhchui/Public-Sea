import prisma from "@/lib/prisma";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

// 初始化 Upstash Redis 客戶端
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL, // 修正為 UPSTASH_REDIS_REST_URL
  token: process.env.UPSTASH_REDIS_REST_TOKEN, // 修正為 UPSTASH_REDIS_REST_TOKEN
});

export async function GET(request) {
  console.log("Received GET request to /api/boards");

  try {
    // 定義快取鍵
    const cacheKey = "boards:all";
    console.log("Checking cache for key:", cacheKey);

    // 嘗試從 Redis 獲取快取數據
    const cachedBoards = await redis.get(cacheKey);
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

    if (!boards || boards.length === 0) {
      console.log("No boards found in the database");
      return NextResponse.json({ message: "No boards found" }, { status: 404 });
    }

    // 將查詢結果儲存到 Redis，快取 1 小時（3600秒）
    await redis.set(cacheKey, boards, { ex: 3600 });
    console.log("Boards cached successfully");

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
        console.error("Error fetching boards from database:", dbError);
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
    await prisma.$disconnect();
  }
}

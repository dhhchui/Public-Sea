import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redisClient";

export async function GET(request) {
  console.log("Received GET request to /api/boards");

  try {
    const cacheKey = "boards:all";
    console.log("Checking cache for key:", cacheKey);

    const redis = getRedisClient();
    let cachedBoards;
    try {
      cachedBoards = await redis.get(cacheKey);
      console.log("Cached boards:", cachedBoards);
    } catch (redisError) {
      console.error("Redis error:", redisError.message);
      cachedBoards = null;
    }

    if (cachedBoards && cachedBoards.length > 0) {
      console.log("Returning cached boards");
      return NextResponse.json({ boards: cachedBoards }, { status: 200 });
    }

    console.log("Cache miss or empty cache, fetching boards from database");
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

    try {
      await redis.set(cacheKey, boards, { ex: 3600 });
      console.log("Boards cached successfully");
    } catch (redisSetError) {
      console.error("Error caching boards to Redis:", redisSetError.message);
    }

    console.log("Boards retrieved:", boards);
    return NextResponse.json({ boards }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/boards:", error);
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

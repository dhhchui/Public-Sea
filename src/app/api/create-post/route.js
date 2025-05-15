// app/api/create-post/route.js
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { getPostListCacheKey } from "@/lib/cache";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function POST(request) {
  console.log("Received POST request to /api/create-post");

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { message: "No token provided" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    console.log("Verifying JWT...");
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not defined in environment variables");
      return NextResponse.json(
        { message: "Server configuration error: JWT_SECRET is missing" },
        { status: 500 }
      );
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    console.log("Decoded userId:", userId);

    const { title, content, boardId } = await request.json();
    console.log("Request body:", { title, content, boardId });

    if (!title || !content || !boardId) {
      return NextResponse.json(
        {
          message:
            "Missing required fields: title, content, and boardId are required",
        },
        { status: 400 }
      );
    }

    const boardIdInt = parseInt(boardId);
    if (isNaN(boardIdInt)) {
      return NextResponse.json({ message: "Invalid boardId" }, { status: 400 });
    }

    // 檢查看板是否存在
    const board = await prisma.board.findUnique({
      where: { id: boardIdInt },
    });
    if (!board) {
      return NextResponse.json({ message: "Board not found" }, { status: 404 });
    }

    // 創建貼文
    const post = await prisma.post.create({
      data: {
        title,
        content,
        authorId: userId,
        boardId: boardIdInt,
        likeCount: 0,
        view: 0,
      },
    });
    console.log("Post created:", post);

    // 將 BigInt 欄位轉換為字符串
    const serializedPost = {
      ...post,
      view: post.view.toString(), // 將 BigInt 轉為字符串
    };

    // 清除與該看板相關的所有快取
    try {
      const keyList = `posts:board:${boardId || "all"}:keys`;
      const cacheKeys = await redis.smembers(keyList);
      console.log("Cache keys to delete:", cacheKeys);
      if (cacheKeys && cacheKeys.length > 0) {
        await redis.del(cacheKeys);
        console.log("Cleared cache keys:", cacheKeys);
      }

      // 同時清除 "all" 看板的快取
      const allKeyList = `posts:board:all:keys`;
      const allCacheKeys = await redis.smembers(allKeyList);
      console.log("All cache keys to delete:", allCacheKeys);
      if (allCacheKeys && allCacheKeys.length > 0) {
        await redis.del(allCacheKeys);
        console.log("Cleared all cache keys:", allCacheKeys);
      }
    } catch (redisError) {
      console.error("Error clearing cache:", redisError.message);
      // 不影響貼文創建，但記錄錯誤
    }

    return NextResponse.json({ post: serializedPost }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/create-post:", error);
    return NextResponse.json(
      { message: "Failed to create post: " + error.message },
      { status: 500 }
    );
  }
}

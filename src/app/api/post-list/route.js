import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { getPostListCacheKey } from "@/lib/cache";

// 初始化 Upstash Redis 客戶端
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// 記錄快取鍵到鍵列表
const addPostListCacheKey = async (boardId, userId) => {
  const key = getPostListCacheKey(boardId, userId);
  const keyList = `posts:board:${boardId || "all"}:keys`;
  await redis.sadd(keyList, key);
  console.log(`Added cache key ${key} to key list ${keyList}`);
};

export async function GET(request) {
  console.log("Received GET request to /api/post-list");

  try {
    let userId = null;
    let isAuthenticated = false;
    const authHeader = request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
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
      userId = decoded.userId;
      isAuthenticated = true;
      console.log("Decoded userId:", userId);
    }

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get("boardId");
    console.log("BoardId from query:", boardId);

    let where = {};
    if (boardId) {
      const boardIdInt = parseInt(boardId);
      if (isNaN(boardIdInt)) {
        console.log("Invalid boardId");
        return NextResponse.json(
          { message: "Invalid boardId" },
          { status: 400 }
        );
      }
      where.boardId = boardIdInt;
    }
    console.log("Where clause:", where);

    let blockedUsers = [];
    let usersWhoBlockedMe = [];
    if (isAuthenticated && userId) {
      try {
        const blockRecords = await prisma.block.findMany({
          where: { blockerId: userId },
          select: { blockedId: true },
        });
        blockedUsers = blockRecords.map((record) => record.blockedId);
        console.log("Blocked users:", blockedUsers);
      } catch (blockError) {
        console.error("Error fetching block records (blocker):", blockError);
        return NextResponse.json(
          { message: "Error fetching blocked users: " + blockError.message },
          { status: 500 }
        );
      }

      try {
        const blockedByRecords = await prisma.block.findMany({
          where: { blockedId: userId },
          select: { blockerId: true },
        });
        usersWhoBlockedMe = blockedByRecords.map((record) => record.blockerId);
        console.log("Users who blocked me:", usersWhoBlockedMe);
      } catch (blockError) {
        console.error("Error fetching block records (blocked):", blockError);
        return NextResponse.json(
          {
            message:
              "Error fetching users who blocked me: " + blockError.message,
          },
          { status: 500 }
        );
      }
    }

    const blockedUserIds = [
      ...new Set([...blockedUsers, ...usersWhoBlockedMe]),
    ];
    if (blockedUserIds.length > 0) {
      where.authorId = { notIn: blockedUserIds };
    }
    console.log("Updated where clause with blocked users:", where);

    const cacheKey = getPostListCacheKey(boardId, userId);
    console.log("Checking cache for key:", cacheKey);

    const cachedPosts = await redis.get(cacheKey);
    if (cachedPosts && cachedPosts.length > 0) {
      console.log("Returning cached posts:", cachedPosts);
      return NextResponse.json({ posts: cachedPosts }, { status: 200 });
    }

    console.log("Cache miss or empty cache, fetching posts from database");
    const posts = await prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
    });
    console.log("Posts retrieved from database:", posts);

    const serializedPosts = posts.map((post) => ({
      ...post,
      view: post.view.toString(), // 將 BigInt 轉為字符串
    }));

    await redis.set(cacheKey, serializedPosts, { ex: 300 });
    console.log("Posts cached successfully");

    await addPostListCacheKey(boardId || "all", userId);

    return NextResponse.json({ posts: serializedPosts }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/post-list:", error);
    return NextResponse.json(
      { message: "Server error: " + error.message },
      { status: 500 }
    );
  }
}

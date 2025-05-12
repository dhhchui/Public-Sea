import prisma from "../../../lib/prisma";
import jwt from "jsonwebtoken";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

// 初始化 Upstash Redis 客戶端
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL, // 修正為 UPSTASH_REDIS_REST_URL
  token: process.env.UPSTASH_REDIS_REST_TOKEN, // 修正為 UPSTASH_REDIS_REST_TOKEN
});

export async function GET(request) {
  console.log("Received GET request to /api/post-list");

  try {
    let userId = null;
    const authHeader = request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      console.log("Verifying JWT...");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.userId;
    }

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get("boardId");

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

    let blockedUsers = [];
    let usersWhoBlockedMe = [];
    if (userId) {
      const blockRecords = await prisma.block.findMany({
        where: { blockerId: userId },
        select: { blockedId: true },
      });
      blockedUsers = blockRecords.map((record) => record.blockedId);

      const blockedByRecords = await prisma.block.findMany({
        where: { blockedId: userId },
        select: { blockerId: true },
      });
      usersWhoBlockedMe = blockedByRecords.map((record) => record.blockerId);
    }

    const blockedUserIds = [...blockedUsers, ...usersWhoBlockedMe];
    if (blockedUserIds.length > 0) {
      where.authorId = { notIn: blockedUserIds };
    }

    // 定義快取鍵，包含 boardId 和 userId
    const cacheKey = `posts:board:${boardId || "all"}:user:${
      userId || "anonymous"
    }`;
    console.log("Checking cache for key:", cacheKey);

    // 嘗試從 Redis 獲取快取數據
    const cachedPosts = await redis.get(cacheKey);
    if (cachedPosts) {
      console.log("Returning cached posts");
      return NextResponse.json({ posts: cachedPosts }, { status: 200 });
    }

    // 如果快取不存在，從資料庫查詢
    console.log("Cache miss, fetching posts from database");
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

    const serializedPosts = posts.map((post) => ({
      ...post,
      view: post.view.toString(),
    }));

    // 將查詢結果儲存到 Redis，快取 5 分鐘（300秒）
    await redis.set(cacheKey, serializedPosts, { ex: 300 });
    console.log("Posts cached successfully");

    return NextResponse.json({ posts: serializedPosts }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/post-list:", error);

    // 如果 Redis 不可用，直接從資料庫查詢
    if (error.message.includes("Redis")) {
      console.log("Redis unavailable, fetching posts from database");
      try {
        let userId = null;
        const authHeader = request.headers.get("Authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
          const token = authHeader.split(" ")[1];
          console.log("Verifying JWT...");
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          userId = decoded.userId;
        }

        const { searchParams } = new URL(request.url);
        const boardId = searchParams.get("boardId");

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

        let blockedUsers = [];
        let usersWhoBlockedMe = [];
        if (userId) {
          const blockRecords = await prisma.block.findMany({
            where: { blockerId: userId },
            select: { blockedId: true },
          });
          blockedUsers = blockRecords.map((record) => record.blockedId);

          const blockedByRecords = await prisma.block.findMany({
            where: { blockedId: userId },
            select: { blockerId: true },
          });
          usersWhoBlockedMe = blockedByRecords.map(
            (record) => record.blockerId
          );
        }

        const blockedUserIds = [...blockedUsers, ...usersWhoBlockedMe];
        if (blockedUserIds.length > 0) {
          where.authorId = { notIn: blockedUserIds };
        }

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

        const serializedPosts = posts.map((post) => ({
          ...post,
          view: post.view.toString(),
        }));

        return NextResponse.json({ posts: serializedPosts }, { status: 200 });
      } catch (dbError) {
        console.error("Error fetching posts from database:", dbError);
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
  }
}

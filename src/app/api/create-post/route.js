import prisma from "../../../lib/prisma";
import jwt from "jsonwebtoken";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

// 初始化 Upstash Redis 客戶端
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// 在 /api/post-list 中記錄快取鍵（假設已實現）
const addPostListCacheKey = async (boardId, userId) => {
  const key = `posts:board:${boardId}:user:${userId || "anonymous"}`;
  const keyList = `posts:board:${boardId}:keys`;
  await redis.sadd(keyList, key);
};

export async function POST(request) {
  console.log("Received POST request to /api/create-post");
  const startTime = performance.now();

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No token provided in Authorization header");
      return NextResponse.json(
        { message: "No token provided" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    console.log("Token received:", token);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    console.log("Decoded JWT userId:", userId);

    const { title, content, boardId } = await request.json();
    if (!title || !content || !boardId) {
      console.log("Missing required fields");
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const post = await prisma.post.create({
      data: {
        title,
        content,
        authorId: userId,
        boardId: parseInt(boardId),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // 獲取用戶資訊（包括 nickname 和好友/關注者）
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true, friends: true, followedIds: true },
    });

    // 為好友和關注者生成通知
    const recipients = [
      ...new Set([...(user.friends || []), ...(user.followedIds || [])]),
    ];
    if (recipients.length > 0) {
      const notifications = recipients.map((recipientId) => ({
        userId: recipientId,
        type: "POST",
        content: `${user.nickname || "一位用戶"} 發布了新貼文：${title}`,
        senderId: userId,
        postId: post.id,
        isRead: false,
        createdAt: new Date(),
      }));
      await prisma.notification.createMany({
        data: notifications,
      });
      console.log(
        `Generated ${notifications.length} POST notifications for post ${post.id}`
      );
    }

    // 序列化 post 物件，將 BigInt 欄位轉為字串
    const serializedPost = {
      ...post,
      view: post.view.toString(),
    };

    // 失效相關分台的快取
    try {
      const keyList = `posts:board:${boardId}:keys`;
      console.log(`Invalidating cache for key list: ${keyList}`);
      const keys = await redis.smembers(keyList);
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(
          `Invalidated ${keys.length} cache keys for board ${boardId}`
        );
        await redis.del(keyList);
      } else {
        console.log(`No cache keys found for board ${boardId}`);
      }
    } catch (cacheError) {
      console.error("Error invalidating cache:", cacheError);
    }

    const endTime = performance.now();
    console.log(`Total response time: ${(endTime - startTime).toFixed(2)}ms`);
    return NextResponse.json({ post: serializedPost }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/create-post:", error);
    return NextResponse.json(
      { message: "Server error: " + error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

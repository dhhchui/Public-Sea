import prisma from "../../../../lib/prisma";
import jwt from "jsonwebtoken";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

// 初始化 Upstash Redis 客戶端
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function GET(request, { params }) {
  console.log("Received GET request to /api/conversation/[conversationId]");
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
    console.log("Verifying JWT...");
    const jwtStartTime = performance.now();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const jwtEndTime = performance.now();
    console.log(
      `JWT verification time: ${(jwtEndTime - jwtStartTime).toFixed(2)}ms`
    );

    const { conversationId } = await params;
    const conversationIdInt = parseInt(conversationId);
    if (isNaN(conversationIdInt)) {
      console.log("Invalid conversationId");
      return NextResponse.json(
        { message: "Invalid conversationId" },
        { status: 400 }
      );
    }

    // 檢查用戶是否屬於該對話
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationIdInt },
      select: {
        id: true,
        user1Id: true,
        user2Id: true,
      },
    });

    if (!conversation) {
      console.log("Conversation not found");
      return NextResponse.json(
        { message: "Conversation not found" },
        { status: 404 }
      );
    }

    if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
      console.log("User not part of this conversation");
      return NextResponse.json(
        { message: "Unauthorized access to conversation" },
        { status: 403 }
      );
    }

    // 定義快取鍵
    const cacheKey = `conversation:${conversationIdInt}`;
    console.log("Checking cache for key:", cacheKey);

    // 嘗試從 Redis 獲取快取數據
    const redisStartTime = performance.now();
    const cachedConversation = await redis.get(cacheKey);
    const redisEndTime = performance.now();
    console.log(
      `Redis query time: ${(redisEndTime - redisStartTime).toFixed(2)}ms`
    );

    if (cachedConversation) {
      const endTime = performance.now();
      console.log(
        `Returning cached conversation, response time: ${(
          endTime - startTime
        ).toFixed(2)}ms`
      );
      return NextResponse.json(
        { conversation: cachedConversation },
        { status: 200 }
      );
    }

    // 如果快取不存在，從資料庫查詢
    console.log("Cache miss, fetching conversation from database");
    const dbStartTime = performance.now();
    const conversationData = await prisma.conversation.findUnique({
      where: { id: conversationIdInt },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 10, // 進一步減少訊息數量
          select: {
            id: true,
            content: true,
            senderId: true,
            createdAt: true,
            sender: {
              select: {
                id: true,
                nickname: true,
              },
            },
          },
        },
        user1: {
          select: {
            id: true,
            nickname: true,
          },
        },
        user2: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
    });

    if (!conversationData) {
      console.log("Conversation not found in database");
      return NextResponse.json(
        { message: "Conversation not found" },
        { status: 404 }
      );
    }

    // 序列化數據
    const serializedConversation = {
      ...conversationData,
      messages: conversationData.messages.map((message) => ({
        ...message,
        createdAt: message.createdAt.toISOString(),
      })),
    };

    const dbEndTime = performance.now();
    console.log(
      `Database query time: ${(dbEndTime - dbStartTime).toFixed(2)}ms`
    );

    // 將數據儲存到快取，快取 60 秒
    await redis.set(cacheKey, serializedConversation, { ex: 60 });
    console.log("Conversation cached successfully");

    const endTime = performance.now();
    console.log(
      `Conversation retrieved, total response time: ${(
        endTime - startTime
      ).toFixed(2)}ms`
    );
    return NextResponse.json(
      { conversation: serializedConversation },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in GET /api/conversation/[conversationId]:", error);
    return NextResponse.json(
      { message: "Server error: " + error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

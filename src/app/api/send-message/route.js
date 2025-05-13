import prisma from "../../../lib/prisma";
import jwt from "jsonwebtoken";
import Pusher from "pusher";
import { Redis } from "@upstash/redis";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

// 初始化 Upstash Redis 客戶端
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function POST(request) {
  console.log("Received POST request to /api/send-message");
  const startTime = performance.now();

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No token provided");
      return new Response(JSON.stringify({ message: "No token provided" }), {
        status: 401,
      });
    }

    const token = authHeader.split(" ")[1];
    console.log("Verifying JWT...");
    const jwtStartTime = performance.now();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const senderId = decoded.userId;
    const jwtEndTime = performance.now();
    console.log(
      `JWT verification time: ${(jwtEndTime - jwtStartTime).toFixed(2)}ms`
    );

    const { receiverId, content } = await request.json();
    console.log("Request body:", { receiverId, content });

    if (!receiverId || !content) {
      console.log("Missing receiverId or content");
      return new Response(
        JSON.stringify({
          message: "Receiver ID and message content are required",
        }),
        { status: 400 }
      );
    }

    const receiverIdInt = parseInt(receiverId);
    if (isNaN(receiverIdInt)) {
      console.log("Invalid receiverId");
      return new Response(JSON.stringify({ message: "Invalid receiverId" }), {
        status: 400,
      });
    }

    // 檢查對話是否存在（使用快取）
    const cacheKey = `conversation:user:${senderId}:${receiverIdInt}`;
    console.log("Checking cache for key:", cacheKey);

    let conversation = await redis.get(cacheKey);
    if (!conversation) {
      console.log("Cache miss, fetching conversation from database");
      const dbStartTime = performance.now();
      conversation = await prisma.conversation.findFirst({
        where: {
          OR: [
            { user1Id: senderId, user2Id: receiverIdInt },
            { user1Id: receiverIdInt, user2Id: senderId },
          ],
        },
      });

      if (!conversation) {
        console.log("Conversation not found, creating new conversation");
        conversation = await prisma.conversation.create({
          data: {
            user1Id: senderId,
            user2Id: receiverIdInt,
          },
        });
      }

      const dbEndTime = performance.now();
      console.log(
        `Database query time: ${(dbEndTime - dbStartTime).toFixed(2)}ms`
      );

      // 快取對話數據，TTL 為 1 小時（3600秒）
      await redis.set(cacheKey, conversation, { ex: 3600 });
      console.log("Conversation cached successfully");
    } else {
      console.log("Returning cached conversation");
    }

    // 創建訊息
    const messageStartTime = performance.now();
    const message = await prisma.message.create({
      data: {
        content,
        senderId,
        conversationId: conversation.id,
        createdAt: new Date(),
      },
    });

    const messageEndTime = performance.now();
    console.log(
      `Message creation time: ${(messageEndTime - messageStartTime).toFixed(
        2
      )}ms`
    );

    // 序列化訊息
    const serializedMessage = {
      ...message,
      createdAt: message.createdAt.toISOString(),
      sender: {
        id: senderId,
        nickname: "Sender", // 假設發送者 nickname，避免查詢
      },
    };

    // 異步觸發 Pusher 通知
    setTimeout(async () => {
      try {
        await pusher.trigger(
          `conversation-${conversation.id}`,
          "new-message",
          serializedMessage
        );
        console.log("Pusher notification sent");
      } catch (pusherError) {
        console.error("Error sending Pusher notification:", pusherError);
      }
    }, 0);

    const endTime = performance.now();
    console.log(`Total response time: ${(endTime - startTime).toFixed(2)}ms`);

    return new Response(
      JSON.stringify({ message: "Message sent successfully" }),
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("Error in POST /api/send-message:", error);
    return new Response(
      JSON.stringify({ message: "Server error: " + error.message }),
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

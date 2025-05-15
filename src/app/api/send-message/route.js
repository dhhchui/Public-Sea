import prisma from "../../../lib/prisma";
import { NextResponse } from "next/server";
import Pusher from "pusher";
import { authMiddleware } from "@/lib/authMiddleware";
import { getRedisClient } from "@/lib/redisClient";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

export const POST = authMiddleware({ required: true })(
  async (request, { userId: senderId }) => {
    console.log("Received POST request to /api/send-message");
    const startTime = performance.now();

    try {
      const { receiverId, content } = await request.json();
      console.log("Request body:", { receiverId, content });

      if (!receiverId || !content) {
        console.log("Missing receiverId or content");
        return NextResponse.json(
          { message: "Receiver ID and message content are required" },
          { status: 400 }
        );
      }

      const receiverIdInt = parseInt(receiverId);
      if (isNaN(receiverIdInt)) {
        console.log("Invalid receiverId");
        return NextResponse.json(
          { message: "Invalid receiverId" },
          { status: 400 }
        );
      }

      const cacheKey = `conversation:user:${senderId}:${receiverIdInt}`;
      console.log("Checking cache for key:", cacheKey);

      const redis = getRedisClient();
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

        await redis.set(cacheKey, conversation, { ex: 3600 });
        console.log("Conversation cached successfully");
      } else {
        console.log("Returning cached conversation");
      }

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

      const notificationStartTime = performance.now();
      await prisma.notification.create({
        data: {
          userId: receiverIdInt,
          senderId,
          conversationId: conversation.id,
          type: "PRIVATE_MESSAGE",
          content:
            content.length > 50 ? content.substring(0, 47) + "..." : content,
          isRead: false,
          createdAt: new Date(),
        },
      });
      const notificationEndTime = performance.now();
      console.log(
        `Notification creation time: ${(
          notificationEndTime - notificationStartTime
        ).toFixed(2)}ms`
      );

      const serializedMessage = {
        ...message,
        createdAt: message.createdAt.toISOString(),
        sender: {
          id: senderId,
          nickname: "Sender",
        },
      };

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

      return NextResponse.json(
        { message: "Message sent successfully" },
        { status: 201 }
      );
    } catch (error) {
      console.error("Error in POST /api/send-message:", error);
      return NextResponse.json(
        { message: "Server error: " + error.message },
        { status: 500 }
      );
    } finally {
      await prisma.$disconnect();
    }
  }
);

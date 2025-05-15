import prisma from "../../../../lib/prisma";
import { NextResponse } from "next/server";
import { authMiddleware } from "@/lib/authMiddleware";
import { getRedisClient } from "@/lib/redisClient";

export const GET = authMiddleware({ required: true })(
  async (request, { userId, params }) => {
    console.log("Received GET request to /api/conversation/[conversationId]");
    const startTime = performance.now();

    try {
      const { conversationId } = await params;
      const conversationIdInt = parseInt(conversationId);
      if (isNaN(conversationIdInt)) {
        console.log("Invalid conversationId");
        return NextResponse.json(
          { message: "Invalid conversationId" },
          { status: 400 }
        );
      }

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

      const cacheKey = `conversation:${conversationIdInt}`;
      console.log("Checking cache for key:", cacheKey);

      const redis = getRedisClient();
      const cachedConversation = await redis.get(cacheKey);

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

      console.log("Cache miss, fetching conversation from database");
      const conversationData = await prisma.conversation.findUnique({
        where: { id: conversationIdInt },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: 10,
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

      const serializedConversation = {
        ...conversationData,
        messages: conversationData.messages.map((message) => ({
          ...message,
          createdAt: message.createdAt.toISOString(),
        })),
      };

      await redis.set(cacheKey, serializedConversation, { ex: 300 }); // TTL 5 分鐘
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
);

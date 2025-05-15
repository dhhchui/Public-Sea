import prisma from "../../../lib/prisma";
import { NextResponse } from "next/server";
import { authMiddleware } from "@/lib/authMiddleware";
import { getRedisClient } from "@/lib/redisClient";

export const GET = authMiddleware({ required: true })(
  async (request, { userId }) => {
    console.log("Received GET request to /api/conversations");

    try {
      const cacheKey = `conversations:${userId}`;
      const redis = getRedisClient();
      let cachedConversations = await redis.get(cacheKey);

      if (cachedConversations) {
        console.log("Returning cached conversations");
        return NextResponse.json(
          { conversations: cachedConversations },
          { status: 200 }
        );
      }

      console.log("Cache miss, fetching conversations from database");
      const conversations = await prisma.conversation.findMany({
        where: {
          OR: [{ user1Id: userId }, { user2Id: userId }],
        },
        include: {
          user1: { select: { id: true, nickname: true } },
          user2: { select: { id: true, nickname: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      await redis.set(cacheKey, conversations, { ex: 3600 }); // TTL 1 小時
      console.log("Conversations cached successfully");

      return NextResponse.json({ conversations }, { status: 200 });
    } catch (error) {
      console.error("Error in GET /api/conversations:", error);
      return NextResponse.json(
        { message: "Server error: " + error.message },
        { status: 500 }
      );
    } finally {
      await prisma.$disconnect();
    }
  }
);

export const POST = authMiddleware({ required: true })(
  async (request, { userId }) => {
    console.log("Received POST request to /api/conversations");

    try {
      const { emailOrNickname, targetUserId } = await request.json();

      if (targetUserId) {
        const targetUserIdInt = parseInt(targetUserId);
        if (isNaN(targetUserIdInt)) {
          console.log("Invalid targetUserId, must be a number");
          return NextResponse.json(
            { message: "Target user ID must be a number" },
            { status: 400 }
          );
        }

        const targetUser = await prisma.user.findUnique({
          where: { id: targetUserIdInt },
          select: { id: true, nickname: true },
        });

        if (!targetUser) {
          console.log("Target user not found:", targetUserId);
          return NextResponse.json(
            { message: "Target user not found" },
            { status: 404 }
          );
        }

        if (targetUser.id === userId) {
          console.log("Cannot create conversation with self");
          return NextResponse.json(
            { message: "Cannot create conversation with self" },
            { status: 400 }
          );
        }

        const existingConversation = await prisma.conversation.findFirst({
          where: {
            OR: [
              { user1Id: userId, user2Id: targetUser.id },
              { user1Id: targetUser.id, user2Id: userId },
            ],
          },
          include: {
            user1: { select: { id: true, nickname: true } },
            user2: { select: { id: true, nickname: true } },
            messages: {
              orderBy: { createdAt: "asc" },
            },
          },
        });

        if (existingConversation) {
          console.log("Existing conversation found:", existingConversation.id);
          return NextResponse.json(
            { conversation: existingConversation },
            { status: 200 }
          );
        }

        const conversation = await prisma.conversation.create({
          data: {
            user1Id: userId,
            user2Id: targetUser.id,
            createdAt: new Date(),
          },
          include: {
            user1: { select: { id: true, nickname: true } },
            user2: { select: { id: true, nickname: true } },
            messages: {
              orderBy: { createdAt: "asc" },
            },
          },
        });

        console.log("New conversation created:", conversation.id);
        return NextResponse.json({ conversation }, { status: 201 });
      }

      if (!emailOrNickname) {
        console.log("Email or nickname not provided");
        return NextResponse.json(
          { message: "Email or nickname is required" },
          { status: 400 }
        );
      }

      const cacheKey = `search:users:${emailOrNickname.toLowerCase()}`;
      const redis = getRedisClient();
      let cachedUsers = await redis.get(cacheKey);

      if (cachedUsers) {
        console.log("Returning cached search results");
        return NextResponse.json({ users: cachedUsers }, { status: 200 });
      }

      console.log(`Searching users with query: "${emailOrNickname}"`);
      const matchedUsers = await prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: emailOrNickname, mode: "insensitive" } },
            { nickname: { contains: emailOrNickname, mode: "insensitive" } },
          ],
          NOT: { id: userId },
        },
        select: { id: true, nickname: true, email: true },
      });

      if (matchedUsers.length === 0) {
        console.log("No users found for:", emailOrNickname);
        return NextResponse.json(
          { message: "No users found" },
          { status: 404 }
        );
      }

      await redis.set(cacheKey, matchedUsers, { ex: 600 }); // TTL 10 分鐘
      console.log("Search results cached successfully");

      return NextResponse.json({ users: matchedUsers }, { status: 200 });
    } catch (error) {
      console.error("Error in POST /api/conversations:", error);
      return NextResponse.json(
        { message: "Server error: " + error.message },
        { status: 500 }
      );
    } finally {
      await prisma.$disconnect();
    }
  }
);

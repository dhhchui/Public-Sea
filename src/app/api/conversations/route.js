import prisma from "../../../lib/prisma";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export async function GET(request) {
  console.log("Received GET request to /api/conversations");
  console.log("JWT_SECRET in /api/conversations:", process.env.JWT_SECRET);

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

    console.log("Conversations fetched:", conversations.length);
    return NextResponse.json({ conversations }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/conversations:", error);
    if (error.name === "JsonWebTokenError") {
      return NextResponse.json(
        { message: "Invalid or expired token" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { message: "Server error: " + error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request) {
  console.log("Received POST request to /api/conversations");
  console.log("JWT_SECRET in /api/conversations:", process.env.JWT_SECRET);

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

    const { emailOrNickname, targetUserId } = await request.json();

    // 如果提供了 targetUserId，則直接創建對話
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

    // 如果提供了 emailOrNickname，則進行模擬搜索
    if (!emailOrNickname) {
      console.log("Email or nickname not provided");
      return NextResponse.json(
        { message: "Email or nickname is required" },
        { status: 400 }
      );
    }

    // 使用模擬搜索查找用戶（忽略大小寫，支持部分匹配）
    const matchedUsers = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: emailOrNickname, mode: "insensitive" } },
          { nickname: { contains: emailOrNickname, mode: "insensitive" } },
        ],
        NOT: { id: userId }, // 排除自己
      },
      select: { id: true, nickname: true, email: true },
    });

    if (matchedUsers.length === 0) {
      console.log("No users found for:", emailOrNickname);
      return NextResponse.json({ message: "No users found" }, { status: 404 });
    }

    console.log("Matched users:", matchedUsers);
    return NextResponse.json({ users: matchedUsers }, { status: 200 });
  } catch (error) {
    console.error("Error in POST /api/conversations:", error);
    if (error.name === "JsonWebTokenError") {
      return NextResponse.json(
        { message: "Invalid or expired token" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { message: "Server error: " + error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

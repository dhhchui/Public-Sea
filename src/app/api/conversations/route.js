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
      return NextResponse.json({ message: "No token provided" }, { status: 401 });
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
      return NextResponse.json({ message: "Invalid or expired token" }, { status: 401 });
    }
    return NextResponse.json({ message: "Server error: " + error.message }, { status: 500 });
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
      return NextResponse.json({ message: "No token provided" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    console.log("Token received:", token);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    console.log("Decoded JWT userId:", userId);

    const { username } = await request.json();
    if (!username) {
      console.log("Username not provided");
      return NextResponse.json({ message: "Username is required" }, { status: 400 });
    }

    const otherUser = await prisma.user.findUnique({
      where: { username },
      select: { id: true, nickname: true },
    });
    if (!otherUser) {
      console.log("User not found:", username);
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (otherUser.id === userId) {
      console.log("Cannot create conversation with self");
      return NextResponse.json({ message: "Cannot create conversation with self" }, { status: 400 });
    }

    const existingConversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { user1Id: userId, user2Id: otherUser.id },
          { user1Id: otherUser.id, user2Id: userId },
        ],
      },
      include: {
        user1: { select: { id: true, nickname: true } },
        user2: { select: { id: true, nickname: true } },
      },
    });

    if (existingConversation) {
      console.log("Existing conversation found:", existingConversation.id);
      return NextResponse.json({ conversation: existingConversation }, { status: 200 });
    }

    const conversation = await prisma.conversation.create({
      data: {
        user1Id: userId,
        user2Id: otherUser.id,
        createdAt: new Date(),
      },
      include: {
        user1: { select: { id: true, nickname: true } },
        user2: { select: { id: true, nickname: true } },
      },
    });

    console.log("New conversation created:", conversation.id);
    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/conversations:", error);
    if (error.name === "JsonWebTokenError") {
      return NextResponse.json({ message: "Invalid or expired token" }, { status: 401 });
    }
    return NextResponse.json({ message: "Server error: " + error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
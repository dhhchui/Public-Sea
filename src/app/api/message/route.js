import prisma from "../../../lib/prisma";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export async function POST(request) {
  console.log("Received POST request to /api/message");
  console.log("JWT_SECRET in /api/message:", process.env.JWT_SECRET);

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

    const { conversationId, content } = await request.json();
    if (!conversationId || !content) {
      console.log("Missing required fields:", { conversationId, content });
      return NextResponse.json({ message: "Conversation ID and content are required" }, { status: 400 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: parseInt(conversationId) },
    });
    if (!conversation) {
      console.log("Conversation not found:", conversationId);
      return NextResponse.json({ message: "Conversation not found" }, { status: 404 });
    }

    if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
      console.log("Unauthorized access to conversation:", conversationId);
      return NextResponse.json({ message: "Unauthorized access to conversation" }, { status: 403 });
    }

    const message = await prisma.message.create({
      data: {
        conversationId: parseInt(conversationId),
        senderId: userId,
        content,
        createdAt: new Date(),
      },
    });

    console.log("Message created:", message.id);
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/message:", error);
    if (error.name === "JsonWebTokenError") {
      return NextResponse.json({ message: "Invalid or expired token" }, { status: 401 });
    }
    return NextResponse.json({ message: "Server error: " + error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
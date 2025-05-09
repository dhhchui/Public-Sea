import prisma from "../../../../lib/prisma";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  console.log("Received GET request to /api/conversation/[conversationId]");
  console.log("Params:", params);
  console.log("JWT_SECRET in /api/conversation/[conversationId]:", process.env.JWT_SECRET);

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

    const { conversationId } = params;
    const conversationIdInt = parseInt(conversationId);

    if (isNaN(conversationIdInt)) {
      console.log("Invalid conversation ID:", conversationId);
      return NextResponse.json({ message: "Invalid conversation ID" }, { status: 400 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationIdInt },
      include: {
        user1: { select: { id: true, nickname: true } },
        user2: { select: { id: true, nickname: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            content: true,
            senderId: true,
            createdAt: true,
          },
        },
      },
    });

    if (!conversation) {
      console.log("Conversation not found:", conversationIdInt);
      return NextResponse.json({ message: "Conversation not found" }, { status: 404 });
    }

    if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
      console.log("Unauthorized access to conversation:", conversationIdInt);
      return NextResponse.json({ message: "Unauthorized access to conversation" }, { status: 403 });
    }

    console.log("Conversation fetched:", conversationIdInt);
    return NextResponse.json({ conversation }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/conversation/[conversationId]:", error);
    if (error.name === "JsonWebTokenError") {
      return NextResponse.json({ message: "Invalid or expired token" }, { status: 401 });
    }
    return NextResponse.json({ message: "Server error: " + error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
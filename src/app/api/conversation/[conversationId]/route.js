import prisma from "../../../../lib/prisma";
import jwt from "jsonwebtoken";

export async function GET(request, { params }) {
  console.log("Received GET request to /api/conversation/[conversationId]");

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No token provided");
      return new Response(JSON.stringify({ message: "No token provided" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const token = authHeader.split(" ")[1];
    console.log("Verifying JWT...");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const { conversationId } = await params;
    const conversationIdInt = parseInt(conversationId);

    if (isNaN(conversationIdInt)) {
      console.log("Invalid conversation ID");
      return new Response(
        JSON.stringify({ message: "Invalid conversation ID" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationIdInt },
      include: {
        user1: { select: { id: true, nickname: true } },
        user2: { select: { id: true, nickname: true } },
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      console.log("Conversation not found");
      return new Response(
        JSON.stringify({ message: "Conversation not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
      console.log("Unauthorized access to conversation");
      return new Response(
        JSON.stringify({ message: "Unauthorized access to conversation" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ conversation }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in GET /api/conversation/[conversationId]:", error);
    return new Response(
      JSON.stringify({ message: "Server error: " + error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
import prisma from "../../../lib/prisma";
import jwt from "jsonwebtoken";

export async function GET(request) {
  console.log("Received GET request to /api/notifications");

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        sender: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
    });

    return new Response(JSON.stringify({ notifications }), { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/notifications:", error);
    return new Response(
      JSON.stringify({ message: "Server error: " + error.message }),
      { status: 500 }
    );
  }
}

export async function POST(request) {
  console.log("Received POST request to /api/notifications");

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const senderId = decoded.userId;

    const { userId, message } = await request.json();
    if (!userId || !message) {
      console.log("Missing userId or message");
      return new Response(
        JSON.stringify({ message: "Missing userId or message" }),
        { status: 400 }
      );
    }

    const notification = await prisma.notification.create({
      data: {
        userId: parseInt(userId),
        senderId,
        message,
        createdAt: new Date(),
      },
      include: {
        sender: {
          select: { id: true, nickname: true },
        },
      },
    });

    return new Response(JSON.stringify({ notification }), { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/notifications:", error);
    return new Response(
      JSON.stringify({ message: "Server error: " + error.message }),
      { status: 500 }
    );
  }
}
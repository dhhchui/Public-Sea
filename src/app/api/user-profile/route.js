import prisma from "../../../lib/prisma";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

// 加載環境變數
dotenv.config();

export async function GET(request) {
  console.log("Received GET request to /api/user-profile");

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
    if (!decoded.userId) {
      console.log("Invalid token payload");
      return new Response(JSON.stringify({ message: "Invalid token" }), {
        status: 401,
      });
    }

    const userId = parseInt(decoded.userId);
    if (isNaN(userId)) {
      console.log("Invalid user ID from token");
      return new Response(JSON.stringify({ message: "Invalid user ID" }), {
        status: 400,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        nickname: true,
        bio: true,
        hobbies: true,
        followerCount: true,
        followedCount: true,
        followerIds: true,
        followedIds: true,
        rating: true,
        isRedFlagged: true,
      },
    });

    if (!user) {
      console.log("User not found");
      return new Response(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    console.log("User retrieved:", user);
    return new Response(JSON.stringify({ user }), { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/user-profile:", error);
    if (error.name === "JsonWebTokenError") {
      console.log("Invalid token");
      return new Response(JSON.stringify({ message: "Invalid token" }), {
        status: 401,
      });
    }
    return new Response(
      JSON.stringify({ message: "Server error: " + error.message }),
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function OPTIONS(request) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
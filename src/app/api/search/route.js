import prisma from "../../../lib/prisma";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

// 加載環境變數
dotenv.config();

export async function POST(request) {
  console.log("Received POST request to /api/search");

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

    let data;
    try {
      data = await request.json();
      console.log("Request body:", data);
    } catch (error) {
      console.error("Error parsing request body:", error);
      return new Response(JSON.stringify({ message: "Invalid request body" }), {
        status: 400,
      });
    }

    const { query } = data;

    if (!query) {
      console.log("Missing query");
      return new Response(
        JSON.stringify({ message: "Search query is required" }),
        { status: 400 }
      );
    }

    // 模糊搜尋用戶：匹配 nickname 或 email，過濾掉自己
    console.log("Searching users with query:", query);
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { nickname: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
        AND: { id: { not: decoded.userId } },
      },
      select: {
        id: true,
        nickname: true,
      },
      take: 5,
    });
    console.log("Found users:", users);

    // 模糊搜尋話題（貼文）：匹配 title 或 content
    console.log("Searching posts with query:", query);
    const posts = await prisma.post.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { content: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        title: true,
        board: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: 5,
    });
    console.log("Found posts:", posts);

    if (users.length === 0 && posts.length === 0) {
      console.log("No matching users or posts found");
      return new Response(
        JSON.stringify({ message: "No matching users or posts found" }),
        { status: 404 }
      );
    }

    return new Response(JSON.stringify({ users, posts }), { status: 200 });
  } catch (error) {
    console.error("Error in POST /api/search:", error);
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
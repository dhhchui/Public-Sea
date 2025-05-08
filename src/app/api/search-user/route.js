import prisma from "../../../lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(request) {
  console.log("Received POST request to /api/search-user");

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

    // 模糊搜尋：匹配 nickname 或 email 包含 query 的用戶
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { nickname: { contains: query, mode: "insensitive" } }, // 模糊搜尋 nickname（不區分大小寫）
          { email: { contains: query, mode: "insensitive" } }, // 模糊搜尋 email（不區分大小寫）
        ],
      },
      select: {
        id: true,
        nickname: true,
      },
    });

    if (!users || users.length === 0) {
      console.log("No users found");
      return new Response(JSON.stringify({ message: "No users found" }), {
        status: 404,
      });
    }

    // 過濾掉自己
    const filteredUsers = users.filter((user) => user.id !== decoded.userId);
    if (filteredUsers.length === 0) {
      console.log("No matching users found (excluding self)");
      return new Response(
        JSON.stringify({ message: "No matching users found" }),
        { status: 404 }
      );
    }

    // 僅返回第一個匹配的用戶（與原功能保持一致）
    const user = filteredUsers[0];

    return new Response(JSON.stringify({ user }), { status: 200 });
  } catch (error) {
    console.error("Error in POST /api/search-user:", error);
    if (error.name === "JsonWebTokenError") {
      console.log("Invalid token");
      return new Response(JSON.stringify({ message: "Invalid token" }), {
        status: 401,
      });
    }
    return new Response(JSON.stringify({ message: "Server error" }), {
      status: 500,
    });
  }
}

import prisma from "../../../lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(request) {
  console.log("Received POST request to /api/users-by-ids");

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
    jwt.verify(token, process.env.JWT_SECRET);

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

    const { userIds } = data;

    if (!userIds || !Array.isArray(userIds)) {
      console.log("Missing or invalid userIds");
      return new Response(
        JSON.stringify({
          message: "User IDs are required and must be an array",
        }),
        { status: 400 }
      );
    }

    // 去重並轉為整數
    const uniqueUserIds = [
      ...new Set(
        userIds
          .map((id) => {
            const parsedId = parseInt(id);
            if (isNaN(parsedId)) {
              console.log(`Invalid user ID: ${id}`);
              return null;
            }
            return parsedId;
          })
          .filter((id) => id !== null)
      ),
    ]; // 移除無效 ID

    console.log("Unique user IDs after deduplication:", uniqueUserIds);

    if (uniqueUserIds.length === 0) {
      console.log("No valid user IDs after processing");
      return new Response(
        JSON.stringify({ message: "No valid user IDs provided" }),
        { status: 400 }
      );
    }

    const users = await prisma.user.findMany({
      where: {
        id: { in: uniqueUserIds },
      },
      select: {
        id: true,
        nickname: true, // 僅返回 id 和 nickname
      },
    });

    console.log("Fetched users:", users);
    return new Response(JSON.stringify({ users }), { status: 200 });
  } catch (error) {
    console.error("Error in POST /api/users-by-ids:", error);
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

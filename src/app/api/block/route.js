import prisma from "../../../lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(request) {
  console.log("Received POST request to /api/block");

  try {
    // 檢查 Authorization 頭
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No token provided");
      return new Response(JSON.stringify({ message: "No token provided" }), {
        status: 401,
      });
    }

    // 提取和驗證 JWT token
    const token = authHeader.split(" ")[1];
    console.log("Verifying JWT...");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // 從請求體中獲取 blockedUserId
    const { blockedUserId } = await request.json();
    if (!blockedUserId) {
      console.log("No blockedUserId provided");
      return new Response(JSON.stringify({ message: "Blocked user ID is required" }), {
        status: 400,
      });
    }

    const blockedUserIdInt = parseInt(blockedUserId);
    if (isNaN(blockedUserIdInt) || blockedUserIdInt === userId) {
      console.log("Invalid blockedUserId or attempting to block self");
      return new Response(
        JSON.stringify({ message: "Invalid blocked user ID or cannot block self" }),
        { status: 400 }
      );
    }

    // 檢查用戶是否存在
    const blockedUser = await prisma.user.findUnique({
      where: { id: blockedUserIdInt },
    });
    if (!blockedUser) {
      console.log("Blocked user not found");
      return new Response(JSON.stringify({ message: "Blocked user not found" }), {
        status: 404,
      });
    }

    // 檢查是否已封鎖
    const existingBlock = await prisma.block.findFirst({
      where: {
        blockerId: userId,
        blockedId: blockedUserIdInt,
      },
    });
    if (existingBlock) {
      console.log("User already blocked");
      return new Response(JSON.stringify({ message: "User already blocked" }), {
        status: 400,
      });
    }

    // 創建封鎖記錄
    await prisma.block.create({
      data: {
        blockerId: userId,
        blockedId: blockedUserIdInt,
      },
    });

    console.log(`User ${blockedUserIdInt} blocked successfully by user ${userId}`);
    return new Response(JSON.stringify({ message: "User blocked successfully" }), {
      status: 200,
    });
  } catch (error) {
    console.error("Error in POST /api/block:", error);
    return new Response(
      JSON.stringify({ message: "Server error: " + error.message }),
      { status: 500 }
    );
  }
}
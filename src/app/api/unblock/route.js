import prisma from "../../../lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(request) {
  console.log("Received POST request to /api/unblock");

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

    // 檢查封鎖記錄是否存在
    const blockRecord = await prisma.block.findFirst({
      where: {
        blockerId: userId,
        blockedId: blockedUserId,
      },
    });

    if (!blockRecord) {
      console.log("Block record not found");
      return new Response(JSON.stringify({ message: "Block record not found" }), {
        status: 404,
      });
    }

    // 刪除封鎖記錄
    await prisma.block.delete({
      where: {
        id: blockRecord.id,
      },
    });

    console.log(`User ${blockedUserId} unblocked successfully by user ${userId}`);
    return new Response(JSON.stringify({ message: "User unblocked successfully" }), {
      status: 200,
    });
  } catch (error) {
    console.error("Error in POST /api/unblock:", error);
    return new Response(
      JSON.stringify({ message: "Server error: " + error.message }),
      { status: 500 }
    );
  }
}
import prisma from "../../../lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(request) {
  console.log("Received POST request to /api/check-redflag");

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

    const { targetUserId } = data;

    if (!targetUserId) {
      console.log("Missing targetUserId");
      return new Response(
        JSON.stringify({ message: "Target user ID is required" }),
        { status: 400 }
      );
    }

    const targetUserIdInt = parseInt(targetUserId);
    if (isNaN(targetUserIdInt)) {
      console.log("Invalid targetUserId");
      return new Response(
        JSON.stringify({ message: "Invalid target user ID" }),
        { status: 400 }
      );
    }

    // 檢查目標用戶是否存在
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserIdInt },
      select: { id: true, rating: true, isRedFlagged: true },
    });

    if (!targetUser) {
      console.log("Target user not found");
      return new Response(
        JSON.stringify({ message: "Target user not found" }),
        { status: 404 }
      );
    }

    // 檢查被封鎖次數
    const blocksReceived = await prisma.block.count({
      where: { blockedId: targetUserIdInt },
    });

    // 定義紅旗條件
    const ratingThreshold = -5; // 評分低於 -5
    const blocksThreshold = 5; // 被封鎖次數超過 5

    const shouldBeRedFlagged =
      targetUser.rating <= ratingThreshold || blocksReceived >= blocksThreshold;

    if (shouldBeRedFlagged && !targetUser.isRedFlagged) {
      // 更新用戶為紅旗狀態
      await prisma.user.update({
        where: { id: targetUserIdInt },
        data: { isRedFlagged: true },
      });
      console.log(`User ${targetUserIdInt} has been marked as redflagged`);
      return new Response(
        JSON.stringify({
          message: `User ${targetUserIdInt} has been marked as redflagged`,
        }),
        { status: 200 }
      );
    } else if (!shouldBeRedFlagged && targetUser.isRedFlagged) {
      // 如果不再符合條件，移除紅旗狀態
      await prisma.user.update({
        where: { id: targetUserIdInt },
        data: { isRedFlagged: false },
      });
      console.log(`User ${targetUserIdInt} has been unmarked as redflagged`);
      return new Response(
        JSON.stringify({
          message: `User ${targetUserIdInt} has been unmarked as redflagged`,
        }),
        { status: 200 }
      );
    }

    return new Response(
      JSON.stringify({
        message: `No change needed for user ${targetUserIdInt}`,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in POST /api/check-redflag:", error);
    return new Response(
      JSON.stringify({ message: "Server error: " + error.message }),
      { status: 500 }
    );
  }
}

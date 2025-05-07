import prisma from "../../../lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(request) {
  console.log("Received POST request to /api/follow");

  try {
    // 驗證 JWT
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

    const { targetUserId } = data;

    if (!targetUserId) {
      console.log("Missing required field: targetUserId");
      return new Response(
        JSON.stringify({ message: "Target user ID is required" }),
        { status: 400 }
      );
    }

    const targetUserIdInt = parseInt(targetUserId);

    // 檢查目標用戶是否存在
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserIdInt },
    });

    if (!targetUser) {
      console.log("Target user not found");
      return new Response(
        JSON.stringify({ message: "Target user not found" }),
        { status: 404 }
      );
    }

    // 檢查用戶是否試圖關注自己
    if (targetUserIdInt === decoded.userId) {
      console.log("Cannot follow yourself");
      return new Response(
        JSON.stringify({ message: "You cannot follow yourself" }),
        { status: 400 }
      );
    }

    // 檢查是否已經關注
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    // 確保 followedIds 是一個數組
    const currentUserFollowedIds = Array.isArray(currentUser.followedIds)
      ? currentUser.followedIds
      : [];
    if (currentUserFollowedIds.includes(targetUserIdInt)) {
      console.log("Already following this user");
      return new Response(
        JSON.stringify({ message: "You are already following this user" }),
        { status: 400 }
      );
    }

    // 確保 followerIds 是一個數組
    const targetUserFollowerIds = Array.isArray(targetUser.followerIds)
      ? targetUser.followerIds
      : [];

    // 確保計數欄位已初始化
    const currentUserFollowedCount = currentUser.followedCount || 0;
    const targetUserFollowerCount = targetUser.followerCount || 0;

    // 使用 Prisma 事務更新數據
    await prisma.$transaction([
      // 更新當前用戶的 followedIds 和 followedCount
      prisma.user.update({
        where: { id: decoded.userId },
        data: {
          followedIds: {
            set: [...currentUserFollowedIds, targetUserIdInt],
          },
          followedCount: {
            set: currentUserFollowedCount + 1, // 使用 set 代替 increment
          },
        },
      }),
      // 更新目標用戶的 followerIds 和 followerCount
      prisma.user.update({
        where: { id: targetUserIdInt },
        data: {
          followerIds: {
            set: [...targetUserFollowerIds, decoded.userId],
          },
          followerCount: {
            set: targetUserFollowerCount + 1, // 使用 set 代替 increment
          },
        },
      }),
    ]);

    console.log("User followed successfully");
    return new Response(
      JSON.stringify({ message: "User followed successfully" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in POST /api/follow:", error);
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
  }
}

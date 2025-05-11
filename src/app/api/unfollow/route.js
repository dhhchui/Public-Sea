import prisma from "../../../lib/prisma";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

// 加載環境變數
dotenv.config();

export async function POST(request) {
  console.log("Received POST request to /api/unfollow");

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

    const { targetUserId } = data;

    if (!targetUserId) {
      console.log("Missing required field: targetUserId");
      return new Response(
        JSON.stringify({ message: "Target user ID is required" }),
        { status: 400 }
      );
    }

    const targetUserIdInt = parseInt(targetUserId);
    if (isNaN(targetUserIdInt)) {
      console.log("Invalid targetUserId, must be a number");
      return new Response(
        JSON.stringify({ message: "Target user ID must be a number" }),
        { status: 400 }
      );
    }

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

    // 檢查用戶是否試圖取消關注自己
    if (targetUserIdInt === decoded.userId) {
      console.log("Cannot unfollow yourself");
      return new Response(
        JSON.stringify({ message: "You cannot unfollow yourself" }),
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
    if (!currentUserFollowedIds.includes(targetUserIdInt)) {
      console.log("Not following this user");
      return new Response(
        JSON.stringify({ message: "You are not following this user" }),
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
            set: currentUserFollowedIds.filter((id) => id !== targetUserIdInt),
          },
          followedCount: {
            set: currentUserFollowedCount - 1,
          },
        },
      }),
      // 更新目標用戶的 followerIds 和 followerCount
      prisma.user.update({
        where: { id: targetUserIdInt },
        data: {
          followerIds: {
            set: targetUserFollowerIds.filter((id) => id !== decoded.userId),
          },
          followerCount: {
            set: targetUserFollowerCount - 1,
          },
        },
      }),
    ]);

    console.log("User unfollowed successfully");
    return new Response(
      JSON.stringify({ message: "User unfollowed successfully" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in POST /api/unfollow:", error);
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
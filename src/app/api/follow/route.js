import prisma from "../../../lib/prisma";
import { NextResponse } from "next/server";
import { authMiddleware } from "@/lib/authMiddleware";
import { getRedisClient } from "@/lib/redisClient";

export const POST = authMiddleware({ required: true })(
  async (request, { userId }) => {
    console.log("Received POST request to /api/follow");

    try {
      const { targetUserId } = await request.json();
      console.log("Request body:", { targetUserId });

      if (!targetUserId) {
        console.log("Missing required field: targetUserId");
        return NextResponse.json(
          { message: "Target user ID is required" },
          { status: 400 }
        );
      }

      const targetUserIdInt = parseInt(targetUserId);
      if (isNaN(targetUserIdInt)) {
        console.log("Invalid targetUserId, must be a number");
        return NextResponse.json(
          { message: "Target user ID must be a number" },
          { status: 400 }
        );
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserIdInt },
      });

      if (!targetUser) {
        console.log("Target user not found");
        return NextResponse.json(
          { message: "Target user not found" },
          { status: 404 }
        );
      }

      if (targetUserIdInt === userId) {
        console.log("Cannot follow yourself");
        return NextResponse.json(
          { message: "You cannot follow yourself" },
          { status: 400 }
        );
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      let currentUserFollowedIds = Array.isArray(currentUser.followedIds)
        ? currentUser.followedIds
        : [];
      currentUserFollowedIds = [...new Set(currentUserFollowedIds)];
      if (currentUserFollowedIds.includes(targetUserIdInt)) {
        console.log("Already following this user");
        return NextResponse.json(
          { message: "You are already following this user" },
          { status: 400 }
        );
      }

      let targetUserFollowerIds = Array.isArray(targetUser.followerIds)
        ? targetUser.followerIds
        : [];
      targetUserFollowerIds = [...new Set(targetUserFollowerIds)];

      const currentUserFollowedCount = currentUserFollowedIds.length;
      const targetUserFollowerCount = targetUserFollowerIds.length;

      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: {
            followedIds: {
              set: [...currentUserFollowedIds, targetUserIdInt],
            },
            followedCount: {
              set: currentUserFollowedCount + 1,
            },
          },
        }),
        prisma.user.update({
          where: { id: targetUserIdInt },
          data: {
            followerIds: {
              set: [...targetUserFollowerIds, userId],
            },
            followerCount: {
              set: targetUserFollowerCount + 1,
            },
          },
        }),
      ]);

      // 失效相關快取
      const redis = getRedisClient();
      await redis.del(`user-profile:${userId}`);
      await redis.del(`user-profile:${targetUserIdInt}`);
      await redis.del(`friends:${userId}`);

      console.log("User followed successfully");
      return NextResponse.json(
        { message: "User followed successfully" },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error in POST /api/follow:", error);
      return NextResponse.json(
        { message: "Server error: " + error.message },
        { status: 500 }
      );
    }
  }
);

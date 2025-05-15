import prisma from "../../../lib/prisma";
import { NextResponse } from "next/server";
import { authMiddleware } from "@/lib/authMiddleware";
import { getRedisClient } from "@/lib/redisClient";

export const POST = authMiddleware({ required: true })(
  async (request, { userId }) => {
    console.log("Received POST request to /api/block");

    try {
      const { blockedUserId } = await request.json();
      console.log("Request body:", { blockedUserId });

      if (!blockedUserId) {
        console.log("No blockedUserId provided");
        return NextResponse.json(
          { message: "Blocked user ID is required" },
          { status: 400 }
        );
      }

      const blockedUserIdInt = parseInt(blockedUserId);
      if (isNaN(blockedUserIdInt) || blockedUserIdInt === userId) {
        console.log("Invalid blockedUserId or attempting to block self");
        return NextResponse.json(
          { message: "Invalid blocked user ID or cannot block self" },
          { status: 400 }
        );
      }

      const blockedUser = await prisma.user.findUnique({
        where: { id: blockedUserIdInt },
      });
      if (!blockedUser) {
        console.log("Blocked user not found");
        return NextResponse.json(
          { message: "Blocked user not found" },
          { status: 404 }
        );
      }

      const existingBlock = await prisma.block.findFirst({
        where: {
          blockerId: userId,
          blockedId: blockedUserIdInt,
        },
      });
      if (existingBlock) {
        console.log("User already blocked");
        return NextResponse.json(
          { message: "User already blocked" },
          { status: 400 }
        );
      }

      await prisma.block.create({
        data: {
          blockerId: userId,
          blockedId: blockedUserIdInt,
        },
      });

      // 失效相關快取
      const redis = getRedisClient();
      await redis.del(`blocked-users:${userId}`);
      await redis.del(`user-profile:${blockedUserIdInt}`);

      console.log(
        `User ${blockedUserIdInt} blocked successfully by user ${userId}`
      );
      return NextResponse.json(
        { message: "User blocked successfully" },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error in POST /api/block:", error);
      return NextResponse.json(
        { message: "Server error: " + error.message },
        { status: 500 }
      );
    }
  }
);

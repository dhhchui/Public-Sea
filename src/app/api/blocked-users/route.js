import prisma from "../../../lib/prisma";
import { NextResponse } from "next/server";
import { authMiddleware } from "@/lib/authMiddleware";
import { getRedisClient } from "@/lib/redisClient";

export const GET = authMiddleware({ required: true })(
  async (request, { userId }) => {
    console.log("Received GET request to /api/blocked-users");

    try {
      const cacheKey = `blocked-users:${userId}`;
      const redis = getRedisClient();
      let cachedBlockedUsers = await redis.get(cacheKey);

      if (cachedBlockedUsers) {
        console.log("Returning cached blocked users");
        return NextResponse.json(
          { blockedList: cachedBlockedUsers },
          { status: 200 }
        );
      }

      console.log("Cache miss, fetching blocked users from database");
      const blockedUsers = await prisma.block.findMany({
        where: { blockerId: userId },
        include: {
          blocked: {
            select: {
              id: true,
              nickname: true,
            },
          },
        },
      });

      const blockedList = blockedUsers.map((block) => ({
        id: block.blocked.id,
        nickname: block.blocked.nickname,
      }));

      await redis.set(cacheKey, blockedList, { ex: 3600 }); // TTL 1 小時
      console.log("Blocked users cached successfully");

      return NextResponse.json({ blockedList }, { status: 200 });
    } catch (error) {
      console.error("Error in GET /api/blocked-users:", error);
      return NextResponse.json(
        { message: "Server error: " + error.message },
        { status: 500 }
      );
    }
  }
);

import prisma from "../../../../lib/prisma";
import { NextResponse } from "next/server";
import { authMiddleware } from "@/lib/authMiddleware";
import { getRedisClient } from "@/lib/redisClient";

export const GET = authMiddleware({ required: true })(
  async (request, { userId }) => {
    console.log("Received GET request to /api/friend-request/list");

    try {
      const cacheKey = `friend-requests:${userId}`;
      const redis = getRedisClient();
      let cachedRequests = await redis.get(cacheKey);

      if (cachedRequests) {
        console.log("Returning cached friend requests");
        return NextResponse.json({ requests: cachedRequests }, { status: 200 });
      }

      console.log("Cache miss, fetching friend requests from database");
      const friendRequests = await prisma.friendRequest.findMany({
        where: {
          receiverId: userId,
          status: "pending",
        },
        include: {
          sender: {
            select: {
              id: true,
              nickname: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      await redis.set(cacheKey, friendRequests, { ex: 3600 }); // TTL 1 小時
      console.log("Friend requests cached successfully");

      return NextResponse.json({ requests: friendRequests }, { status: 200 });
    } catch (error) {
      console.error("Error in GET /api/friend-request/list:", error);
      return NextResponse.json(
        { message: "Server error: " + error.message },
        { status: 500 }
      );
    }
  }
);

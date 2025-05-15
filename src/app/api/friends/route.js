import prisma from "../../../lib/prisma";
import { NextResponse } from "next/server";
import { authMiddleware } from "@/lib/authMiddleware";
import { getRedisClient } from "@/lib/redisClient";

export const GET = authMiddleware({ required: true })(
  async (request, { userId }) => {
    console.log("Received GET request to /api/friends");

    try {
      const cacheKey = `friends:${userId}`;
      const redis = getRedisClient();
      let cachedFriends = await redis.get(cacheKey);

      if (cachedFriends) {
        console.log("Returning cached friends");
        return NextResponse.json({ friends: cachedFriends }, { status: 200 });
      }

      console.log("Cache miss, fetching friends from database");
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { friends: true },
      });

      if (!user) {
        console.log("User not found");
        return NextResponse.json(
          { message: "User not found" },
          { status: 404 }
        );
      }

      const friends = await prisma.user.findMany({
        where: { id: { in: user.friends } },
        select: {
          id: true,
          nickname: true,
        },
      });

      await redis.set(cacheKey, friends, { ex: 3600 }); // TTL 1 小時
      console.log("Friends cached successfully");

      return NextResponse.json({ friends }, { status: 200 });
    } catch (error) {
      console.error("Error in GET /api/friends:", error);
      return NextResponse.json(
        { message: "Server error: " + error.message },
        { status: 500 }
      );
    }
  }
);

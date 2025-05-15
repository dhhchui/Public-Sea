import prisma from "../../../lib/prisma";
import { NextResponse } from "next/server";
import { authMiddleware } from "@/lib/authMiddleware";
import { getRedisClient } from "@/lib/redisClient";

export const GET = authMiddleware({ required: true })(
  async (request, { userId }) => {
    console.log("Received GET request to /api/me");

    try {
      const cacheKey = `user-profile:${userId}`;
      const redis = getRedisClient();
      let cachedUser = await redis.get(cacheKey);

      if (cachedUser) {
        console.log("Returning cached user profile");
        return NextResponse.json(
          {
            message: "User fetched successfully",
            user: cachedUser,
          },
          { status: 200 }
        );
      }

      console.log("Cache miss, fetching user from database");
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          nickname: true,
        },
      });

      if (!user) {
        console.log("User not found");
        return NextResponse.json(
          { message: "User not found" },
          { status: 404 }
        );
      }

      await redis.set(cacheKey, user, { ex: 3600 }); // TTL 1 小時
      console.log("User profile cached successfully");

      return NextResponse.json(
        {
          message: "User fetched successfully",
          user,
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error in GET /api/me:", error);
      return NextResponse.json(
        { message: "Server error: " + error.message },
        { status: 500 }
      );
    }
  }
);

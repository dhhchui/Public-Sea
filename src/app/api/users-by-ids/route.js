import prisma from "../../../lib/prisma";
import { NextResponse } from "next/server";
import { authMiddleware } from "@/lib/authMiddleware";
import { getRedisClient } from "@/lib/redisClient";

export const POST = authMiddleware({ required: true })(
  async (request, { userId }) => {
    console.log("Received POST request to /api/users-by-ids");

    try {
      const { userIds } = await request.json();
      console.log("Request body:", { userIds });

      if (!userIds || !Array.isArray(userIds)) {
        console.log("Missing or invalid userIds");
        return NextResponse.json(
          { message: "User IDs are required and must be an array" },
          { status: 400 }
        );
      }

      const uniqueUserIds = [
        ...new Set(
          userIds
            .map((id) => {
              const parsedId = parseInt(id);
              if (isNaN(parsedId)) {
                console.log(`Invalid user ID: ${id}`);
                return null;
              }
              return parsedId;
            })
            .filter((id) => id !== null)
        ),
      ];

      if (uniqueUserIds.length === 0) {
        console.log("No valid user IDs after processing");
        return NextResponse.json(
          { message: "No valid user IDs provided" },
          { status: 400 }
        );
      }

      const cacheKey = `users-by-ids:${uniqueUserIds.sort().join(",")}`;
      const redis = getRedisClient();
      let cachedUsers = await redis.get(cacheKey);

      if (cachedUsers) {
        console.log("Returning cached users");
        return NextResponse.json({ users: cachedUsers }, { status: 200 });
      }

      console.log("Cache miss, fetching users from database");
      const users = await prisma.user.findMany({
        where: {
          id: { in: uniqueUserIds },
        },
        select: {
          id: true,
          nickname: true,
        },
      });

      await redis.set(cacheKey, users, { ex: 3600 }); // TTL 1 小時
      console.log("Users cached successfully");

      return NextResponse.json({ users }, { status: 200 });
    } catch (error) {
      console.error("Error in POST /api/users-by-ids:", error);
      return NextResponse.json(
        { message: "Server error: " + error.message },
        { status: 500 }
      );
    }
  }
);

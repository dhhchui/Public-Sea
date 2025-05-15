import prisma from "../../../lib/prisma";
import { NextResponse } from "next/server";
import { authMiddleware } from "@/lib/authMiddleware";
import { getRedisClient } from "@/lib/redisClient";

export const POST = authMiddleware({ required: true })(
  async (request, { userId }) => {
    console.log("Received POST request to /api/search/users");

    try {
      const { query } = await request.json();
      console.log("Request body:", { query });

      if (!query) {
        console.log("Missing query");
        return NextResponse.json(
          { message: "Search query is required" },
          { status: 400 }
        );
      }

      const cacheKey = `search:users:${query.toLowerCase()}`;
      const redis = getRedisClient();
      let cachedUsers = await redis.get(cacheKey);

      if (cachedUsers) {
        console.log("Returning cached users");
        return NextResponse.json({ users: cachedUsers }, { status: 200 });
      }

      console.log(`Searching users with query: "${query}"`);
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { nickname: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          nickname: true,
        },
        take: 5,
      });

      await redis.set(cacheKey, users, { ex: 600 }); // TTL 10 分鐘
      console.log("Users cached successfully");

      return NextResponse.json({ users }, { status: 200 });
    } catch (error) {
      console.error("Error in POST /api/search/users:", error);
      return NextResponse.json(
        { message: "Server error: " + error.message },
        { status: 500 }
      );
    } finally {
      await prisma.$disconnect();
    }
  }
);

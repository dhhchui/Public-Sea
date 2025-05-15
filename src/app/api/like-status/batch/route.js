import prisma from "../../../../lib/prisma";
import { NextResponse } from "next/server";
import { authMiddleware } from "@/lib/authMiddleware";
import { getRedisClient } from "@/lib/redisClient";

export const POST = authMiddleware({ required: true })(
  async (request, { userId }) => {
    console.log("Received POST request to /api/like-status/batch");

    try {
      const { items } = await request.json();
      if (!Array.isArray(items) || items.length === 0) {
        console.log("Invalid or empty items array");
        return NextResponse.json(
          { message: "Items array is required" },
          { status: 400 }
        );
      }

      const cacheKey = `like-status:batch:${userId}:${items
        .map((item) => `${item.itemId}:${item.itemType}`)
        .sort()
        .join(",")}`;
      const redis = getRedisClient();
      let cachedStatuses = await redis.get(cacheKey);

      if (cachedStatuses) {
        console.log("Returning cached like statuses");
        return NextResponse.json({ statuses: cachedStatuses }, { status: 200 });
      }

      console.log("Cache miss, fetching like statuses from database");
      const statuses = await Promise.all(
        items.map(async ({ itemId, itemType }) => {
          const like = await prisma.like.findUnique({
            where: {
              userId_itemId_itemType: {
                userId,
                itemId,
                itemType,
              },
            },
          });
          return {
            itemId,
            itemType,
            liked: !!like,
          };
        })
      );

      await redis.set(cacheKey, statuses, { ex: 3600 }); // TTL 1 小時
      console.log("Like statuses cached successfully");

      return NextResponse.json({ statuses }, { status: 200 });
    } catch (error) {
      console.error("Error in POST /api/like-status/batch:", error);
      return NextResponse.json(
        { message: "Server error: " + error.message },
        { status: 500 }
      );
    } finally {
      await prisma.$disconnect();
    }
  }
);

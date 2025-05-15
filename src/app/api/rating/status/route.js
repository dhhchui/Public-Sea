import prisma from "../../../../lib/prisma";
import { NextResponse } from "next/server";
import { authMiddleware } from "@/lib/authMiddleware";
import { getRedisClient } from "@/lib/redisClient";

export const GET = authMiddleware({ required: true })(
  async (request, { userId: raterId }) => {
    console.log("Received GET request to /api/rating/status");

    try {
      const { searchParams } = new URL(request.url);
      const ratedUserId = searchParams.get("ratedUserId");
      if (!ratedUserId) {
        console.log("Missing ratedUserId");
        return NextResponse.json(
          { message: "Rated user ID is required" },
          { status: 400 }
        );
      }

      const ratedUserIdInt = parseInt(ratedUserId);
      if (isNaN(ratedUserIdInt) || ratedUserIdInt === raterId) {
        console.log("Invalid ratedUserId or attempting to check self");
        return NextResponse.json(
          { message: "Invalid rated user ID or cannot check self" },
          { status: 400 }
        );
      }

      const cacheKey = `rating:status:${raterId}:${ratedUserIdInt}`;
      const redis = getRedisClient();
      let cachedRating = await redis.get(cacheKey);

      if (cachedRating) {
        console.log("Returning cached rating status");
        return NextResponse.json(cachedRating, { status: 200 });
      }

      console.log("Cache miss, fetching rating from database");
      const rating = await prisma.userRating.findUnique({
        where: {
          raterId_ratedUserId: {
            raterId,
            ratedUserId: ratedUserIdInt,
          },
        },
      });

      const response = {
        hasRated: !!rating,
        rating: rating ? rating.rating : null,
      };

      await redis.set(cacheKey, response, { ex: 3600 }); // TTL 1 小時
      console.log("Rating status cached successfully");

      return NextResponse.json(response, { status: 200 });
    } catch (error) {
      console.error("Error in GET /api/rating/status:", error);
      return NextResponse.json(
        { message: "Server error: " + error.message },
        { status: 500 }
      );
    }
  }
);

import prisma from "../../../lib/prisma";
import { NextResponse } from "next/server";
import { authMiddleware } from "@/lib/authMiddleware";
import { getRedisClient } from "@/lib/redisClient";

export const POST = authMiddleware({ required: true })(
  async (request, { userId: raterId }) => {
    console.log("Received POST request to /api/rating");

    try {
      const { ratedUserId, rating } = await request.json();
      console.log("Request body:", { ratedUserId, rating });

      if (!ratedUserId || ![-1, 1].includes(rating)) {
        console.log("Missing ratedUserId or invalid rating");
        return NextResponse.json(
          {
            message: "Rated user ID and valid rating (+1 or -1) are required",
          },
          { status: 400 }
        );
      }

      const ratedUserIdInt = parseInt(ratedUserId);
      if (isNaN(ratedUserIdInt) || ratedUserIdInt === raterId) {
        console.log("Invalid ratedUserId or attempting to rate self");
        return NextResponse.json(
          { message: "Invalid rated user ID or cannot rate self" },
          { status: 400 }
        );
      }

      const ratedUser = await prisma.user.findUnique({
        where: { id: ratedUserIdInt },
      });
      if (!ratedUser) {
        console.log("Rated user not found");
        return NextResponse.json(
          { message: "Rated user not found" },
          { status: 404 }
        );
      }

      const existingRating = await prisma.userRating.findUnique({
        where: {
          raterId_ratedUserId: {
            raterId: raterId,
            ratedUserId: ratedUserIdInt,
          },
        },
      });

      if (existingRating) {
        console.log("You have already rated this user");
        return NextResponse.json(
          { message: "You have already rated this user" },
          { status: 400 }
        );
      }

      await prisma.userRating.create({
        data: {
          raterId: raterId,
          ratedUserId: ratedUserIdInt,
          rating: rating,
        },
      });

      const newRating = await prisma.userRating.aggregate({
        where: { ratedUserId: ratedUserIdInt },
        _sum: { rating: true },
      });

      const updatedRating = newRating._sum.rating || 0;

      await prisma.user.update({
        where: { id: ratedUserIdInt },
        data: { rating: updatedRating },
      });

      // 失效用戶個人資料快取
      const redis = getRedisClient();
      await redis.del(`user-profile:${ratedUserIdInt}`);

      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const response = await fetch(`${baseUrl}/api/check-redflag`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: request.headers.get("Authorization"),
        },
        body: JSON.stringify({ targetUserId: ratedUserIdInt }),
      });

      if (!response.ok) {
        console.error("Failed to check redflag status:", await response.text());
      }

      return NextResponse.json(
        {
          message: "Rating submitted successfully",
          newRating: updatedRating,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("Error in POST /api/rating:", error);
      return NextResponse.json(
        { message: "Server error: " + error.message },
        { status: 500 }
      );
    }
  }
);

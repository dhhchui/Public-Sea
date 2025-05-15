import prisma from "../../../../lib/prisma";
import { NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redisClient";

export async function GET(request, { params }) {
  console.log("Received GET request to /api/user-profile/[userId]");

  try {
    const { userId } = await params;
    const userIdInt = parseInt(userId);

    if (isNaN(userIdInt)) {
      console.log("Invalid user ID");
      return NextResponse.json({ message: "Invalid user ID" }, { status: 400 });
    }

    const cacheKey = `user-profile:${userIdInt}`;
    const redis = getRedisClient();
    let cachedUser = await redis.get(cacheKey);

    if (cachedUser) {
      console.log("Returning cached user profile");
      return NextResponse.json({ user: cachedUser }, { status: 200 });
    }

    console.log("Cache miss, fetching user from database");
    const user = await prisma.user.findUnique({
      where: { id: userIdInt },
      select: {
        id: true,
        username: true,
        nickname: true,
        bio: true,
        hobbies: true,
        followerCount: true,
        followedCount: true,
        followerIds: true,
        followedIds: true,
        rating: true,
        isRedFlagged: true,
      },
    });

    if (!user) {
      console.log("User not found");
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    await redis.set(cacheKey, user, { ex: 3600 }); // TTL 1 小時
    console.log("User profile cached successfully");

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/user-profile/[userId]:", error);
    return NextResponse.json(
      { message: "Server error: " + error.message },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

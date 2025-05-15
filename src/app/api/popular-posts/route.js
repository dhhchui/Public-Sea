import prisma from "../../../lib/prisma";
import { NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redisClient";

export async function GET(request) {
  console.log("Received GET request to /api/popular-posts");

  try {
    const cacheKey = "popular-posts";
    const redis = getRedisClient();
    let cachedPosts = await redis.get(cacheKey);

    if (cachedPosts) {
      console.log("Returning cached posts");
      return NextResponse.json({ posts: cachedPosts }, { status: 200 });
    }

    console.log("Cache miss, fetching posts from database");
    const posts = await prisma.post.findMany({
      take: 20,
      orderBy: { view: "desc" },
      include: {
        author: {
          select: {
            id: true,
            nickname: true,
          },
        },
        board: {
          select: {
            name: true,
          },
        },
      },
    });

    const serializedPosts = posts.map((post) => ({
      ...post,
      view: post.view.toString(),
    }));

    await redis.set(cacheKey, serializedPosts, { ex: 600 }); // TTL 10 分鐘
    console.log("Posts cached successfully");

    return NextResponse.json({ posts: serializedPosts }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/popular-posts:", error);
    return NextResponse.json(
      { message: "Server error: " + error.message },
      { status: 500 }
    );
  }
}

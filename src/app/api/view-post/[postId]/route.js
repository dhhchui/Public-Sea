import prisma from "../../../../lib/prisma";
import { NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redisClient";

export async function GET(request, { params }) {
  console.log("Received GET request to /api/view-post/[postId]");
  const startTime = performance.now();

  try {
    console.log("DATABASE_URL:", process.env.DATABASE_URL);
    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL is not defined in environment variables");
      return NextResponse.json(
        { message: "Server configuration error: Database URL is missing" },
        { status: 500 }
      );
    }

    const { postId } = await params;
    const postIdInt = parseInt(postId);

    if (isNaN(postIdInt)) {
      console.log("Invalid postId:", postId);
      return NextResponse.json({ message: "Invalid postId" }, { status: 400 });
    }

    // 統一快取鍵，無需 userId
    const cacheKey = `post:view:${postIdInt}:anonymous`;
    console.log("Checking cache for key:", cacheKey);

    const redis = getRedisClient();
    const cachedPost = await redis.get(cacheKey);
    if (cachedPost) {
      let updatedPost;
      try {
        updatedPost = await prisma.post.update({
          where: { id: postIdInt },
          data: { view: { increment: 1 } },
          select: { view: true },
        });
      } catch (dbError) {
        console.error("Database error while updating view count:", dbError);
      }

      const updatedCachedPost = {
        ...cachedPost,
        view: updatedPost.view.toString(),
      };

      await redis.set(cacheKey, updatedCachedPost, { ex: 600 });

      const endTime = performance.now();
      console.log(
        `Returning cached post, response time: ${(endTime - startTime).toFixed(
          2
        )}ms`
      );
      return NextResponse.json({ post: updatedCachedPost }, { status: 200 });
    }

    console.log("Cache miss, fetching post from database");
    let post;
    try {
      const dbStartTime = performance.now();
      post = await prisma.post.findUnique({
        where: { id: postIdInt },
        include: {
          author: {
            select: {
              id: true,
              nickname: true,
              isRedFlagged: true,
            },
          },
          board: {
            select: {
              id: true,
              name: true,
            },
          },
          comments: {
            orderBy: { createdAt: "desc" },
            include: {
              author: {
                select: {
                  id: true,
                  nickname: true,
                  isRedFlagged: true,
                },
              },
            },
          },
        },
      });
      const dbEndTime = performance.now();
      console.log(
        `Database query time: ${(dbEndTime - dbStartTime).toFixed(2)}ms`
      );
    } catch (dbError) {
      console.error("Database error while fetching post:", dbError);
      return NextResponse.json(
        { message: "Failed to fetch post due to database error" },
        { status: 503 }
      );
    }

    if (!post) {
      console.log("Post not found for postId:", postIdInt);
      return NextResponse.json({ message: "Post not found" }, { status: 404 });
    }

    // 過濾紅旗用戶的評論
    post.comments = post.comments
      .map((comment) => {
        if (!comment.id || isNaN(comment.id)) {
          console.error("Invalid comment ID:", comment.id);
          return null;
        }
        return {
          ...comment,
          isCollapsed: comment.author.isRedFlagged,
        };
      })
      .filter((comment) => comment !== null);

    try {
      await prisma.post.update({
        where: { id: postIdInt },
        data: {
          view: { increment: 1 },
        },
      });
    } catch (dbError) {
      console.error("Database error while updating view count:", dbError);
    }

    const serializedPost = {
      ...post,
      view: post.view.toString(),
    };

    await redis.set(cacheKey, serializedPost, { ex: 600 });
    console.log("Post cached successfully");

    const endTime = performance.now();
    console.log(
      `Post retrieved, total response time: ${(endTime - startTime).toFixed(
        2
      )}ms`
    );
    return NextResponse.json({ post: serializedPost }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/view-post/[postId]:", error);
    return NextResponse.json(
      { message: "Server error: " + error.message },
      { status: 500 }
    );
  }
}

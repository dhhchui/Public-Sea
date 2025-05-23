import prisma from "../../../../lib/prisma";
import jwt from "jsonwebtoken";
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

    let userId = null;
    const authHeader = request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      console.log("Verifying JWT...");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.userId;
    }

    const { postId } = await params;
    const postIdInt = parseInt(postId);

    if (isNaN(postIdInt)) {
      console.log("Invalid postId:", postId);
      return NextResponse.json({ message: "Invalid postId" }, { status: 400 });
    }

    const cacheKey = `post:view:${postIdInt}:user:${userId || "anonymous"}`;
    console.log("Checking cache for key:", cacheKey);

    const redis = getRedisClient(); // 使用全局 Redis 客戶端
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

      await redis.set(cacheKey, updatedCachedPost, { ex: 600 }); // 延長 TTL 至 10 分鐘

      const endTime = performance.now();
      console.log(
        `Returning cached post, response time: ${(endTime - startTime).toFixed(
          2
        )}ms`
      );
      return NextResponse.json({ post: updatedCachedPost }, { status: 200 });
    }

    console.log("Cache miss, fetching post from database");
    let blockedUsers = [];
    let usersWhoBlockedMe = [];
    if (userId) {
      try {
        const blockRecords = await prisma.block.findMany({
          where: { blockerId: userId },
          select: { blockedId: true },
        });
        blockedUsers = blockRecords.map((record) => record.blockedId);

        const blockedByRecords = await prisma.block.findMany({
          where: { blockedId: userId },
          select: { blockerId: true },
        });
        usersWhoBlockedMe = blockedByRecords.map((record) => record.blockerId);
      } catch (dbError) {
        console.error("Database error while fetching block records:", dbError);
        return NextResponse.json(
          { message: "Failed to fetch blocked users due to database error" },
          { status: 503 }
        );
      }
    }

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

    if (userId) {
      const blockedUserIds = [...blockedUsers, ...usersWhoBlockedMe];
      if (blockedUserIds.includes(post.authorId)) {
        console.log("Post author is blocked or has blocked you");
        return NextResponse.json(
          { message: "Post author is blocked or has blocked you" },
          { status: 403 }
        );
      }

      post.comments = post.comments
        .map((comment) => {
          if (!comment.id || isNaN(comment.id)) {
            console.error("Invalid comment ID:", comment.id);
            return null;
          }
          if (blockedUserIds.includes(comment.authorId)) {
            return null;
          }
          return {
            ...comment,
            isCollapsed: comment.author.isRedFlagged,
          };
        })
        .filter((comment) => comment !== null);
    }

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

    await redis.set(cacheKey, serializedPost, { ex: 600 }); // 延長 TTL 至 10 分鐘
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

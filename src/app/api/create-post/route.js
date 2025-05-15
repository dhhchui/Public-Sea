import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { authMiddleware } from "@/lib/authMiddleware";
import { getRedisClient } from "@/lib/redisClient";
import { getPostListCacheKey } from "@/lib/cache";

export const POST = authMiddleware({ required: true })(
  async (request, { userId }) => {
    console.log("Received POST request to /api/create-post");

    try {
      const { title, content, boardId } = await request.json();
      console.log("Request body:", { title, content, boardId });

      if (!title || !content || !boardId) {
        return NextResponse.json(
          {
            message:
              "Missing required fields: title, content, and boardId are required",
          },
          { status: 400 }
        );
      }

      const boardIdInt = parseInt(boardId);
      if (isNaN(boardIdInt)) {
        return NextResponse.json(
          { message: "Invalid boardId" },
          { status: 400 }
        );
      }

      const board = await prisma.board.findUnique({
        where: { id: boardIdInt },
      });
      if (!board) {
        return NextResponse.json(
          { message: "Board not found" },
          { status: 404 }
        );
      }

      const post = await prisma.post.create({
        data: {
          title,
          content,
          authorId: userId,
          boardId: boardIdInt,
          likeCount: 0,
          view: 0,
        },
      });

      const serializedPost = {
        ...post,
        view: post.view.toString(),
      };

      const redis = getRedisClient();
      try {
        const keyList = `posts:board:${boardId || "all"}:keys`;
        const cacheKeys = await redis.smembers(keyList);
        console.log("Cache keys to delete:", cacheKeys);
        if (cacheKeys && cacheKeys.length > 0) {
          await redis.del(cacheKeys);
          console.log("Cleared cache keys:", cacheKeys);
        }

        const allKeyList = `posts:board:all:keys`;
        const allCacheKeys = await redis.smembers(allKeyList);
        console.log("All cache keys to delete:", allCacheKeys);
        if (allCacheKeys && allCacheKeys.length > 0) {
          await redis.del(allCacheKeys);
          console.log("Cleared all cache keys:", allCacheKeys);
        }
      } catch (redisError) {
        console.error("Error clearing cache:", redisError.message);
      }

      return NextResponse.json({ post: serializedPost }, { status: 201 });
    } catch (error) {
      console.error("Error in POST /api/create-post:", error);
      return NextResponse.json(
        { message: "Failed to create post: " + error.message },
        { status: 500 }
      );
    }
  }
);

import prisma from "../../../lib/prisma";
import { NextResponse } from "next/server";
import Pusher from "pusher";
import { authMiddleware } from "@/lib/authMiddleware";
import { getRedisClient } from "@/lib/redisClient";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

export const POST = authMiddleware({ required: true })(
  async (request, { userId }) => {
    console.log("Received POST request to /api/comment");
    const startTime = performance.now();

    try {
      const { postId, content } = await request.json();
      console.log("Request body:", { postId, content });

      if (!postId || !content) {
        console.log("Missing postId or content");
        return NextResponse.json(
          { message: "Post ID and comment content are required" },
          { status: 400 }
        );
      }

      const postIdInt = parseInt(postId);
      if (isNaN(postIdInt)) {
        console.log("Invalid postId");
        return NextResponse.json(
          { message: "Invalid postId" },
          { status: 400 }
        );
      }

      const post = await prisma.post.findUnique({
        where: { id: postIdInt },
        include: {
          author: {
            select: {
              id: true,
              nickname: true,
            },
          },
        },
      });

      if (!post) {
        console.log("Post not found");
        return NextResponse.json(
          { message: "Post not found" },
          { status: 404 }
        );
      }

      const blockRecord = await prisma.block.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: post.author.id,
            blockedId: userId,
          },
        },
      });

      if (blockRecord) {
        console.log("You are blocked by the post author");
        return NextResponse.json(
          { message: "You are blocked by the post author" },
          { status: 403 }
        );
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          nickname: true,
          username: true,
          isRedFlagged: true,
        },
      });
      if (!user) {
        console.log("User not found");
        return NextResponse.json(
          { message: "User not found" },
          { status: 404 }
        );
      }

      const comment = await prisma.comment.create({
        data: {
          content,
          postId: postIdInt,
          authorId: userId,
          likeCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              nickname: true,
              isRedFlagged: true,
            },
          },
        },
      });

      const serializedComment = {
        ...comment,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
        isCollapsed: comment.author.isRedFlagged,
      };

      if (post.author.id !== userId) {
        await prisma.notification.create({
          data: {
            userId: post.author.id,
            type: "comment",
            content: `${
              comment.author.nickname || comment.author.username || "一位用戶"
            } 評論了你的貼文`,
            senderId: userId,
            postId: postIdInt,
            isRead: false,
            createdAt: new Date(),
          },
        });

        await pusher.trigger(`post-${postIdInt}`, "new-comment", {
          type: "comment",
          postId: postIdInt,
          senderId: userId,
          comment: serializedComment,
        });
      }

      const redis = getRedisClient();
      try {
        const cachePattern = `post:view:${postIdInt}:*`;
        console.log(`Invalidating cache for pattern: ${cachePattern}`);
        const keys = await redis.keys(cachePattern);
        if (keys.length > 0) {
          await redis.del(keys);
          console.log(
            `Invalidated ${keys.length} cache keys for post ${postIdInt}`
          );
        }
      } catch (cacheError) {
        console.error("Error invalidating cache:", cacheError);
      }

      const endTime = performance.now();
      console.log(`Total response time: ${(endTime - startTime).toFixed(2)}ms`);
      return NextResponse.json(
        {
          message: "Comment created successfully",
          comment: serializedComment,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("Error in POST /api/comment:", error);
      return NextResponse.json(
        { message: "Server error: " + error.message },
        { status: 500 }
      );
    } finally {
      await prisma.$disconnect();
    }
  }
);

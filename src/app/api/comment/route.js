import prisma from "../../../lib/prisma";
import jwt from "jsonwebtoken";
import Pusher from "pusher";
import { Redis } from "@upstash/redis";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function POST(request) {
  console.log("Received POST request to /api/comment");
  const startTime = performance.now();

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No token provided");
      return new Response(JSON.stringify({ message: "No token provided" }), {
        status: 401,
      });
    }

    const token = authHeader.split(" ")[1];
    console.log("Verifying JWT...");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // 檢查 userId 是否有效
    if (!userId || isNaN(userId)) {
      console.log("Invalid userId in token");
      return new Response(
        JSON.stringify({ message: "Invalid token: userId missing or invalid" }),
        {
          status: 401,
        }
      );
    }

    // 可選：檢查用戶是否存在
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, nickname: true, username: true },
    });
    if (!user) {
      console.log("User not found");
      return new Response(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    let data;
    try {
      data = await request.json();
      console.log("Request body:", data);
    } catch (error) {
      console.error("Error parsing request body:", error);
      return new Response(JSON.stringify({ message: "Invalid request body" }), {
        status: 400,
      });
    }

    const { postId, content } = data;

    if (!postId || !content) {
      console.log("Missing postId or content");
      return new Response(
        JSON.stringify({ message: "Post ID and comment content are required" }),
        { status: 400 }
      );
    }

    const postIdInt = parseInt(postId);
    if (isNaN(postIdInt)) {
      console.log("Invalid postId");
      return new Response(JSON.stringify({ message: "Invalid postId" }), {
        status: 400,
      });
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
      return new Response(JSON.stringify({ message: "Post not found" }), {
        status: 404,
      });
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
      return new Response(
        JSON.stringify({ message: "You are blocked by the post author" }),
        { status: 403 }
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
    };
    console.log("Created comment:", serializedComment);

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
      console.log(`Generated comment notification for user ${post.author.id}`);

      await pusher.trigger(`user-${post.author.id}`, "notification", {
        type: "comment",
        postId: postIdInt,
        senderId: userId,
        message: `${
          comment.author.nickname || comment.author.username || "一位用戶"
        } 評論了你的貼文`,
      });
    }

    try {
      const cachePattern = `post:view:${postIdInt}:*`;
      console.log(`Invalidating cache for pattern: ${cachePattern}`);
      const keys = await redis.keys(cachePattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(
          `Invalidated ${keys.length} cache keys for post ${postIdInt}`
        );
      }
    } catch (cacheError) {
      console.error("Error invalidating cache:", cacheError);
    }

    const endTime = performance.now();
    console.log(`Total response time: ${(endTime - startTime).toFixed(2)}ms`);
    return new Response(
      JSON.stringify({
        message: "Comment created successfully",
        comment: serializedComment,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/comment:", error);
    if (error.name === "JsonWebTokenError") {
      return new Response(
        JSON.stringify({ message: "Invalid or expired token" }),
        {
          status: 401,
        }
      );
    }
    return new Response(
      JSON.stringify({ message: "Server error: " + error.message }),
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

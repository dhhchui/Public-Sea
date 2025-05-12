import prisma from "../../../lib/prisma";
import jwt from "jsonwebtoken";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

export async function POST(request) {
  console.log("Received POST request to /api/comment");

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
        likeCount: 0, // 明確設置初始 likeCount 為 0
      },
      include: {
        author: {
          select: {
            username: true, // 包含 author 的 username 字段
          },
        },
      },
    });

    // 為貼文作者生成評論通知（如果貼文作者不是評論者自己）
    if (post.author.id !== userId) {
      await prisma.notification.create({
        data: {
          userId: post.author.id,
          type: "comment",
          relatedId: postIdInt,
          senderId: userId,
          isRead: false,
        },
      });

      await pusher.trigger(`user-${post.author.id}`, "notification", {
        type: "comment",
        relatedId: postIdInt,
        senderId: userId,
        message: "你的貼文收到了一條新評論",
      });
    }

    return new Response(
      JSON.stringify({ message: "Comment created successfully", comment }),
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/comment:", error);
    return new Response(
      JSON.stringify({ message: "Server error: " + error.message }),
      { status: 500 }
    );
  }
}
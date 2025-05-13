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
  console.log("Received POST request to /api/create-post");

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

    const { title, content, boardId } = data;

    if (!title || !content || !boardId) {
      console.log("Missing required fields");
      return new Response(
        JSON.stringify({ message: "Title, content, and boardId are required" }),
        { status: 400 }
      );
    }

    const boardIdInt = parseInt(boardId);
    if (isNaN(boardIdInt)) {
      console.log("Invalid boardId");
      return new Response(JSON.stringify({ message: "Invalid boardId" }), {
        status: 400,
      });
    }

    const board = await prisma.board.findUnique({
      where: { id: boardIdInt },
    });
    if (!board) {
      console.log("Board not found");
      return new Response(JSON.stringify({ message: "Board not found" }), {
        status: 404,
      });
    }

    const post = await prisma.post.create({
      data: {
        title,
        content,
        boardId: boardIdInt,
        authorId: userId,
        view: BigInt(0),
      },
    });

    // 為好友和追蹤者生成新貼文通知
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { friends: true, followerIds: true },
    });

    if (!user) {
      console.log("User not found");
      return new Response(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    const friends = user.friends || [];
    const followers = user.followerIds || [];
    const notificationRecipients = [...new Set([...friends, ...followers])];

    for (const recipientId of notificationRecipients) {
      if (recipientId === userId) continue;

      const source = friends.includes(recipientId) ? "friend" : "following";

      await prisma.notification.create({
        data: {
          userId: recipientId,
          type: "new_post",
          source: source, // 設置來源類型
          relatedId: post.id,
          senderId: userId,
          isRead: false,
        },
      });

      const message =
        source === "friend"
          ? `你的朋友發布了一篇新貼文`
          : `你追蹤中的用戶發布了一篇新貼文`;

      await pusher.trigger(`user-${recipientId}`, "notification", {
        type: "new_post",
        source: source,
        relatedId: post.id,
        senderId: userId,
        message: message,
      });
    }

    const serializedPost = {
      ...post,
      view: post.view.toString(),
    };

    return new Response(
      JSON.stringify({
        message: "Post created successfully",
        post: serializedPost,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/create-post:", error);
    return new Response(
      JSON.stringify({ message: "Server error: " + error.message }),
      { status: 500 }
    );
  }
}

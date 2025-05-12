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
  console.log("Received POST request to /api/send-message");

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No token provided");
      return new Response(JSON.stringify({ message: "No token provided" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const token = authHeader.split(" ")[1];
    console.log("Verifying JWT...");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const senderId = decoded.userId;

    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { isRedFlagged: true, friends: true, nickname: true },
    });

    if (!sender) {
      console.log("Sender not found");
      return new Response(JSON.stringify({ message: "Sender not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
      });
    }

    const { receiverId, content } = data;

    if (!receiverId || !content) {
      console.log("Missing receiverId or content");
      return new Response(
        JSON.stringify({
          message: "Receiver ID and message content are required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const receiverIdInt = parseInt(receiverId);
    if (isNaN(receiverIdInt) || receiverIdInt === senderId) {
      console.log("Invalid receiverId or attempting to send message to self");
      return new Response(
        JSON.stringify({
          message: "Invalid receiver ID or cannot send message to self",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const receiver = await prisma.user.findUnique({
      where: { id: receiverIdInt },
    });
    if (!receiver) {
      console.log("Receiver not found");
      return new Response(JSON.stringify({ message: "Receiver not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const blockRecord = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: receiverIdInt,
          blockedId: senderId,
        },
      },
    });
    if (blockRecord) {
      console.log("You are blocked by the receiver");
      return new Response(
        JSON.stringify({ message: "You are blocked by the receiver" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (sender.isRedFlagged) {
      const friends = sender.friends || [];
      if (!friends.includes(receiverIdInt)) {
        console.log("Restricted user can only send PM to friends");
        return new Response(
          JSON.stringify({
            message: "由於你的帳戶被限制，只能向好友發送私人訊息",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    let conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { user1Id: senderId, user2Id: receiverIdInt },
          { user1Id: receiverIdInt, user2Id: senderId },
        ],
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          user1Id: senderId,
          user2Id: receiverIdInt,
        },
      });
    }

    // 保存消息到資料庫
    const savedMessage = await prisma.message.create({
      data: {
        content,
        senderId,
        conversationId: conversation.id,
        createdAt: new Date(),
      },
    });

    const message = {
      id: savedMessage.id,
      content: savedMessage.content,
      senderId: savedMessage.senderId,
      conversationId: savedMessage.conversationId,
      createdAt: savedMessage.createdAt.toISOString(),
    };

    // 創建通知，存入 prisma.notification
    await fetch("/api/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId: receiverIdInt,
        message: `${sender.nickname} 向你發送了一條新消息`,
      }),
    });

    // Pusher 推送通知
    await pusher.trigger(`user-${receiverIdInt}`, "notification", {
      type: "pm",
      relatedId: conversation.id,
      senderId: senderId,
      message: `${sender.nickname} 向你發送了一個新的 PM`,
    });

    // 推送新消息到對話
    await pusher.trigger(
      `conversation-${conversation.id}`,
      "new-message",
      message
    );

    return new Response(
      JSON.stringify({
        message: "Message sent successfully",
        conversationId: conversation.id,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in POST /api/send-message:", error);
    return new Response(
      JSON.stringify({ message: "Server error: " + error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
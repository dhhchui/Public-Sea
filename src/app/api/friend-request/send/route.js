import prisma from "../../../lib/prisma";
import { NextResponse } from "next/server";
import { authMiddleware } from "@/lib/authMiddleware";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

export const POST = authMiddleware({ required: true })(
  async (request, { userId: senderId }) => {
    console.log("Received POST request to /api/friend-request/send");
    const startTime = performance.now();

    try {
      const sender = await prisma.user.findUnique({
        where: { id: senderId },
        select: { isRedFlagged: true, nickname: true },
      });

      if (!sender) {
        console.log("Sender not found");
        return NextResponse.json(
          { message: "Sender not found" },
          { status: 404 }
        );
      }

      if (sender.isRedFlagged) {
        console.log("Sender is redflagged and cannot send friend requests");
        return NextResponse.json(
          { message: "由於你的帳戶被標記為紅旗，無法發送好友請求" },
          { status: 403 }
        );
      }

      const { receiverId } = await request.json();
      console.log("Request body:", { receiverId });

      if (!receiverId || receiverId === senderId) {
        console.log("Invalid receiverId or attempting to send request to self");
        return NextResponse.json(
          { message: "無效的接收者 ID 或無法向自己發送請求" },
          { status: 400 }
        );
      }

      const receiverIdInt = parseInt(receiverId);
      if (isNaN(receiverIdInt)) {
        console.log("Invalid receiverId");
        return NextResponse.json(
          { message: "無效的接收者 ID" },
          { status: 400 }
        );
      }

      const receiver = await prisma.user.findUnique({
        where: { id: receiverIdInt },
      });
      if (!receiver) {
        console.log("Receiver not found");
        return NextResponse.json({ message: "接收者不存在" }, { status: 404 });
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
        return NextResponse.json(
          { message: "你已被接收者封鎖" },
          { status: 403 }
        );
      }

      const senderUser = await prisma.user.findUnique({
        where: { id: senderId },
        select: { friends: true },
      });
      if (senderUser.friends.includes(receiverIdInt)) {
        console.log("You are already friends");
        return NextResponse.json({ message: "你們已是好友" }, { status: 400 });
      }

      const existingRequest = await prisma.friendRequest.findFirst({
        where: {
          senderId,
          receiverId: receiverIdInt,
        },
      });

      if (existingRequest) {
        console.log(
          "Friend request already exists with status:",
          existingRequest.status
        );
        return NextResponse.json(
          {
            message:
              existingRequest.status === "pending"
                ? "已發送過待處理的好友請求"
                : existingRequest.status === "accepted"
                ? "你們已是好友"
                : "之前已發送過請求，請等待對方處理",
          },
          { status: 400 }
        );
      }

      const friendRequest = await prisma.friendRequest.create({
        data: {
          senderId,
          receiverId: receiverIdInt,
          status: "pending",
        },
        include: {
          sender: {
            select: {
              id: true,
              nickname: true,
            },
          },
        },
      });

      await prisma.notification.create({
        data: {
          userId: receiverIdInt,
          type: "FRIEND_REQUEST",
          content: `${sender.nickname || "一位用戶"} 發送了好友請求`,
          senderId,
          isRead: false,
          createdAt: new Date(),
        },
      });

      await pusher.trigger(`user-${receiverIdInt}`, "notification", {
        type: "FRIEND_REQUEST",
        senderId,
        message: `${sender.nickname || "一位用戶"} 發送了好友請求`,
      });

      const endTime = performance.now();
      console.log(`Total response time: ${(endTime - startTime).toFixed(2)}ms`);
      return NextResponse.json(
        { message: "好友請求已發送", friendRequest },
        { status: 201 }
      );
    } catch (error) {
      console.error("Error in POST /api/friend-request/send:", error);
      return NextResponse.json(
        { message: "伺服器錯誤: " + error.message },
        { status: 500 }
      );
    }
  }
);

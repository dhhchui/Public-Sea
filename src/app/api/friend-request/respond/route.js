import prisma from "../../../../lib/prisma";
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
    console.log("Received POST request to /api/friend-request/respond");
    const startTime = performance.now();

    try {
      const { requestId, action } = await request.json();
      console.log("Request body:", { requestId, action });

      if (!requestId || !["accept", "reject"].includes(action)) {
        console.log("Missing requestId or invalid action");
        return NextResponse.json(
          {
            message: "Request ID and valid action (accept/reject) are required",
          },
          { status: 400 }
        );
      }

      const requestIdInt = parseInt(requestId);
      if (isNaN(requestIdInt)) {
        console.log("Invalid requestId");
        return NextResponse.json(
          { message: "Invalid requestId" },
          { status: 400 }
        );
      }

      const friendRequest = await prisma.friendRequest.findUnique({
        where: { id: requestIdInt },
        include: {
          sender: { select: { id: true, nickname: true } },
          receiver: { select: { id: true, nickname: true } },
        },
      });

      if (!friendRequest) {
        console.log("Friend request not found");
        return NextResponse.json(
          { message: "Friend request not found" },
          { status: 404 }
        );
      }

      if (friendRequest.receiverId !== userId) {
        console.log(
          "Unauthorized: You are not the receiver of this friend request"
        );
        return NextResponse.json(
          {
            message:
              "Unauthorized: You are not the receiver of this friend request",
          },
          { status: 403 }
        );
      }

      if (friendRequest.status !== "pending") {
        console.log("Friend request is not pending");
        return NextResponse.json(
          { message: "Friend request is not pending" },
          { status: 400 }
        );
      }

      const redis = getRedisClient();
      if (action === "reject") {
        await prisma.friendRequest.update({
          where: { id: requestIdInt },
          data: { status: "rejected" },
        });

        await prisma.notification.create({
          data: {
            userId: friendRequest.senderId,
            type: "friend_reject",
            content: `${friendRequest.receiver.nickname} 拒絕了你的好友請求`,
            senderId: friendRequest.receiverId,
            isRead: false,
            createdAt: new Date(),
          },
        });

        await pusher.trigger(`user-${friendRequest.senderId}`, "notification", {
          type: "friend_reject",
          senderId: friendRequest.receiverId,
          message: `${friendRequest.receiver.nickname} 拒絕了你的好友請求`,
        });

        const endTime = performance.now();
        console.log(
          `Total response time: ${(endTime - startTime).toFixed(2)}ms`
        );
        return NextResponse.json(
          { message: "Friend request rejected successfully" },
          { status: 200 }
        );
      }

      const senderId = friendRequest.senderId;
      const receiverId = friendRequest.receiverId;

      await prisma.friendRequest.update({
        where: { id: requestIdInt },
        data: { status: "accepted" },
      });

      await prisma.user.update({
        where: { id: senderId },
        data: {
          friends: { push: receiverId },
        },
      });

      await prisma.user.update({
        where: { id: receiverId },
        data: {
          friends: { push: senderId },
        },
      });

      const sender = await prisma.user.findUnique({
        where: { id: senderId },
        select: { followerIds: true, followedIds: true },
      });

      const receiver = await prisma.user.findUnique({
        where: { id: receiverId },
        select: { followerIds: true, followedIds: true },
      });

      await prisma.user.update({
        where: { id: senderId },
        data: {
          followerIds: { set: [...(sender.followerIds || []), receiverId] },
          followedIds: { set: [...(sender.followedIds || []), receiverId] },
          followedCount: { increment: 1 },
        },
      });

      await prisma.user.update({
        where: { id: receiverId },
        data: {
          followerIds: { set: [...(receiver.followerIds || []), senderId] },
          followedIds: { set: [...(receiver.followedIds || []), senderId] },
          followedCount: { increment: 1 },
        },
      });

      await prisma.notification.create({
        data: {
          userId: senderId,
          type: "friend_accept",
          content: `${friendRequest.receiver.nickname} 接受了你的好友請求`,
          senderId: receiverId,
          isRead: false,
          createdAt: new Date(),
        },
      });

      await pusher.trigger(`user-${senderId}`, "notification", {
        type: "friend_accept",
        senderId: receiverId,
        message: `${friendRequest.receiver.nickname} 接受了你的好友請求`,
      });

      // 失效好友列表快取
      await redis.del(`friends:${senderId}`);
      await redis.del(`friends:${receiverId}`);

      const endTime = performance.now();
      console.log(`Total response time: ${(endTime - startTime).toFixed(2)}ms`);
      return NextResponse.json(
        { message: "Friend request accepted successfully" },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error in POST /api/friend-request/respond:", error);
      return NextResponse.json(
        { message: "Server error: " + error.message },
        { status: 500 }
      );
    }
  }
);

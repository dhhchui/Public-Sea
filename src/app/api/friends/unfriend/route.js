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
    console.log("Received POST request to /api/friends/unfriend");
    const startTime = performance.now();

    try {
      const { friendId } = await request.json();
      console.log("Request body:", { friendId });

      if (!friendId) {
        console.log("Missing friendId");
        return NextResponse.json({ message: "請提供好友 ID" }, { status: 400 });
      }

      const friendIdInt = parseInt(friendId);
      if (isNaN(friendIdInt)) {
        console.log("Invalid friendId");
        return NextResponse.json({ message: "無效的好友 ID" }, { status: 400 });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { friends: true, nickname: true },
      });

      if (!user) {
        console.log("User not found");
        return NextResponse.json({ message: "用戶不存在" }, { status: 404 });
      }

      if (!user.friends.includes(friendIdInt)) {
        console.log("Friend not found in user's friends list");
        return NextResponse.json(
          { message: "該用戶不是你的好友" },
          { status: 400 }
        );
      }

      const friend = await prisma.user.findUnique({
        where: { id: friendIdInt },
        select: { friends: true },
      });

      if (!friend) {
        console.log("Friend not found");
        return NextResponse.json({ message: "好友不存在" }, { status: 404 });
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: {
            friends: {
              set: user.friends.filter((id) => id !== friendIdInt),
            },
          },
        }),
        prisma.user.update({
          where: { id: friendIdInt },
          data: {
            friends: {
              set: friend.friends.filter((id) => id !== userId),
            },
          },
        }),
      ]);

      await prisma.notification.create({
        data: {
          userId: friendIdInt,
          type: "friend_remove",
          content: `${user.nickname || "一位用戶"} 已解除與你的好友關係`,
          senderId: userId,
          isRead: false,
          createdAt: new Date(),
        },
      });

      await pusher.trigger(`user-${friendIdInt}`, "notification", {
        type: "friend_remove",
        senderId: userId,
        message: `${user.nickname || "一位用戶"} 已解除與你的好友關係`,
      });

      // 失效相關快取
      const redis = getRedisClient();
      await redis.del(`friends:${userId}`);
      await redis.del(`friends:${friendIdInt}`);

      const endTime = performance.now();
      console.log(`Total response time: ${(endTime - startTime).toFixed(2)}ms`);
      return NextResponse.json({ message: "已解除好友關係" }, { status: 200 });
    } catch (error) {
      console.error("Error in POST /api/friends/unfriend:", error);
      return NextResponse.json(
        { message: "伺服器錯誤: " + error.message },
        { status: 500 }
      );
    }
  }
);

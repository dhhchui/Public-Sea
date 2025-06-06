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
    console.log("Received POST request to /api/like");
    const startTime = performance.now();

    try {
      const { itemId, itemType, action } = await request.json();
      if (!itemId || !itemType || !action) {
        console.log("Missing required fields:", { itemId, itemType, action });
        return NextResponse.json(
          { message: "Item ID, item type, and action are required" },
          { status: 400 }
        );
      }

      if (!["post", "comment"].includes(itemType)) {
        console.log("Invalid item type:", itemType);
        return NextResponse.json(
          { message: "Invalid item type" },
          { status: 400 }
        );
      }

      if (!["like", "unlike"].includes(action)) {
        console.log("Invalid action:", action);
        return NextResponse.json(
          { message: "Invalid action" },
          { status: 400 }
        );
      }

      const model = itemType === "post" ? prisma.post : prisma.comment;
      const selectFields = {
        id: true,
        authorId: true,
        ...(itemType === "post" ? { title: true } : { content: true }),
      };
      const item = await model.findUnique({
        where: { id: itemId },
        select: selectFields,
      });

      if (!item) {
        console.log(`${itemType} not found:`, itemId);
        return NextResponse.json(
          { message: `${itemType} not found` },
          { status: 404 }
        );
      }

      const likeIdentifier = {
        userId_itemId_itemType: {
          userId,
          itemId,
          itemType,
        },
      };

      const redis = getRedisClient();
      if (action === "like") {
        const existingLike = await prisma.like.findUnique({
          where: likeIdentifier,
        });
        if (existingLike) {
          console.log("Like already exists:", likeIdentifier);
          return NextResponse.json(
            { message: "Already liked" },
            { status: 400 }
          );
        }

        const result = await prisma.$transaction(async (tx) => {
          await tx.like.create({
            data: {
              userId,
              itemId,
              itemType,
              createdAt: new Date(),
            },
          });

          const updatedItem = await tx[itemType].update({
            where: { id: itemId },
            data: { likeCount: { increment: 1 } },
            select: { likeCount: true },
          });

          if (item.authorId !== userId) {
            const user = await tx.user.findUnique({
              where: { id: userId },
              select: { friends: true, nickname: true },
            });

            if (user.friends.includes(item.authorId)) {
              await tx.notification.create({
                data: {
                  userId: item.authorId,
                  type: "LIKE",
                  content: `${user.nickname || "一位用戶"} 點讚了你的${
                    itemType === "post" ? "貼文" : "評論"
                  }`,
                  senderId: userId,
                  postId: itemType === "post" ? itemId : undefined,
                  isRead: false,
                  createdAt: new Date(),
                },
              });

              await pusher.trigger(`user-${item.authorId}`, "notification", {
                type: "LIKE",
                senderId: userId,
                postId: itemType === "post" ? itemId : undefined,
                message: `${user.nickname || "一位用戶"} 點讚了你的${
                  itemType === "post" ? "貼文" : "評論"
                }`,
              });
            }
          }

          return updatedItem;
        });

        // 失效相關快取
        if (itemType === "post") {
          await redis.del(`post:view:${itemId}:user:${userId || "anonymous"}`);
          await redis.del(getPostListCacheKey(null, userId));
        }

        console.log("Like created:", likeIdentifier);
        return NextResponse.json(
          { message: "Liked successfully", likeCount: result.likeCount },
          { status: 200 }
        );
      } else {
        const existingLike = await prisma.like.findUnique({
          where: likeIdentifier,
        });
        if (!existingLike) {
          console.log("Like does not exist:", likeIdentifier);
          return NextResponse.json(
            { message: "Not liked yet" },
            { status: 400 }
          );
        }

        const result = await prisma.$transaction([
          prisma.like.delete({ where: likeIdentifier }),
          model.update({
            where: { id: itemId },
            data: { likeCount: { decrement: 1 } },
          }),
        ]);

        // 失效相關快取
        if (itemType === "post") {
          await redis.del(`post:view:${itemId}:user:${userId || "anonymous"}`);
          await redis.del(getPostListCacheKey(null, userId));
        }

        console.log("Like removed:", likeIdentifier);
        return NextResponse.json(
          { message: "Unliked successfully", likeCount: result[1].likeCount },
          { status: 200 }
        );
      }
    } catch (error) {
      console.error("Error in POST /api/like:", error);
      return NextResponse.json(
        { message: "Server error: " + error.message },
        { status: 500 }
      );
    } finally {
      await prisma.$disconnect();
    }
  }
);

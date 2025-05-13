import prisma from "../../../lib/prisma";
import jwt from "jsonwebtoken";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

// 初始化 Upstash Redis 客戶端
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function GET(request) {
  console.log("Received GET request to /api/recommend-users");

  try {
    // 驗證用戶身份
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No token provided in Authorization header");
      return NextResponse.json(
        { message: "No token provided" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    console.log("Token received:", token);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    console.log("Decoded JWT userId:", userId);

    // 定義快取鍵
    const cacheKey = `recommend:users:${userId}`;
    console.log("Checking cache for key:", cacheKey);

    // 嘗試從 Redis 獲取快取數據
    const cachedRecommendations = await redis.get(cacheKey);
    if (cachedRecommendations) {
      console.log("Returning cached recommendations");
      return NextResponse.json(
        { users: cachedRecommendations },
        { status: 200 }
      );
    }

    // 從資料庫查詢當前用戶
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        hobbies: true,
      },
    });

    if (!currentUser) {
      console.log("User not found");
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // 獲取封鎖用戶
    const blockRecords = await prisma.block.findMany({
      where: { blockerId: userId },
      select: { blockedId: true },
    });
    const blockedUsers = blockRecords.map((record) => record.blockedId);

    const blockedByRecords = await prisma.block.findMany({
      where: { blockedId: userId },
      select: { blockerId: true },
    });
    const usersWhoBlockedMe = blockedByRecords.map(
      (record) => record.blockerId
    );

    const blockedUserIds = [...blockedUsers, ...usersWhoBlockedMe, userId]; // 排除自己和封鎖用戶

    let recommendedUsers = [];

    // 情況 1：hobbies 為空，隨機推薦
    if (!currentUser.hobbies || currentUser.hobbies.length === 0) {
      console.log("User has no hobbies, recommending random users");
      recommendedUsers = await prisma.user.findMany({
        where: {
          id: { notIn: blockedUserIds },
        },
        select: {
          id: true,
          username: true,
          nickname: true,
          hobbies: true,
        },
        take: 5, // 推薦 5 個用戶
        orderBy: {
          id: "asc", // 簡單隨機（可使用隨機排序，但 Prisma 不直接支援）
        },
      });
    } else {
      // 情況 2：有 hobbies，優先推薦相同 hobbies 的用戶
      console.log("User has hobbies, recommending users with matching hobbies");
      recommendedUsers = await prisma.user.findMany({
        where: {
          id: { notIn: blockedUserIds },
          hobbies: {
            hasSome: currentUser.hobbies, // 查找有至少一個相同 hobby 的用戶
          },
        },
        select: {
          id: true,
          username: true,
          nickname: true,
          hobbies: true,
        },
        take: 5, // 最多 5 個
        orderBy: {
          followerCount: "desc",
        },
      });

      // 情況 3：如果不足 5 個，補充共同評論的用戶
      if (recommendedUsers.length < 5) {
        console.log(
          "Not enough users with matching hobbies, recommending users from shared comments"
        );
        const remainingCount = 5 - recommendedUsers.length;

        // 查找當前用戶的評論
        const userComments = await prisma.comment.findMany({
          where: { authorId: userId },
          select: { postId: true },
        });
        const userPostIds = userComments.map((comment) => comment.postId);

        if (userPostIds.length > 0) {
          // 查找在同一貼文下留言的其他用戶
          const sharedCommentUsers = await prisma.comment.findMany({
            where: {
              postId: { in: userPostIds },
              authorId: { notIn: blockedUserIds },
              NOT: { authorId: userId }, // 排除自己
            },
            select: {
              author: {
                select: {
                  id: true,
                  username: true,
                  nickname: true,
                  hobbies: true,
                },
              },
            },
            distinct: ["authorId"],
            take: remainingCount,
          });

          const additionalUsers = sharedCommentUsers.map(
            (comment) => comment.author
          );
          recommendedUsers = [
            ...recommendedUsers,
            ...additionalUsers.filter(
              (user) => !recommendedUsers.some((u) => u.id === user.id)
            ),
          ].slice(0, 5); // 確保總數不超過 5
        }

        // 情況 4：如果仍不足 5 個，隨機補充直到滿足 5 個或用盡用戶列表
        if (recommendedUsers.length < 5) {
          const remainingCountFinal = 5 - recommendedUsers.length;
          const randomUsers = await prisma.user.findMany({
            where: {
              id: {
                notIn: [
                  ...blockedUserIds,
                  ...recommendedUsers.map((u) => u.id),
                ],
              },
            },
            select: {
              id: true,
              username: true,
              nickname: true,
              hobbies: true,
            },
            take: remainingCountFinal,
            orderBy: {
              id: "asc",
            },
          });
          recommendedUsers = [...recommendedUsers, ...randomUsers].slice(0, 5);
        }
      }
    }

    // 將推薦結果儲存到快取，快取 5 分鐘（300秒）
    await redis.set(cacheKey, recommendedUsers, { ex: 300 });
    console.log("Recommendations cached successfully");

    return NextResponse.json({ users: recommendedUsers }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/recommend-users:", error);
    return NextResponse.json(
      { message: "Server error: " + error.message },
      { status: 500 }
    );
  }
}

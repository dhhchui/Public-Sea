import prisma from "../../../lib/prisma";
import jwt from "jsonwebtoken";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function GET(request) {
  console.log("Received GET request to /api/recommend-users");
  const startTime = performance.now();

  try {
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

    const cacheKey = `recommend:users:${userId}`;
    console.log("Checking cache for key:", cacheKey);

    const cachedRecommendations = await redis.get(cacheKey);
    if (cachedRecommendations) {
      console.log("Returning cached recommendations");
      const endTime = performance.now();
      console.log(`Total response time: ${(endTime - startTime).toFixed(2)}ms`);
      return NextResponse.json(
        { users: cachedRecommendations },
        { status: 200 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        followedIds: true,
        hobbies: {
          select: { name: true },
        },
      },
    });

    if (!currentUser) {
      console.log("User not found");
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const blockRecords = await prisma.block.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
      select: {
        blockerId: true,
        blockedId: true,
      },
    });

    const blockedUserIds = [
      ...new Set([
        ...blockRecords.map((record) => record.blockerId),
        ...blockRecords.map((record) => record.blockedId),
        userId,
      ]),
    ];

    const followedUserIds = currentUser.followedIds || [];
    let recommendedUsers = [];

    const currentUserHobbies = currentUser.hobbies.map((hobby) => hobby.name);

    if (!currentUserHobbies || currentUserHobbies.length === 0) {
      console.log("User has no hobbies, recommending random users");
      recommendedUsers = await prisma.user.findMany({
        where: {
          id: { notIn: [...blockedUserIds, ...followedUserIds] },
          isRedFlagged: false,
        },
        select: {
          id: true,
          username: true,
          nickname: true,
          hobbies: {
            select: { name: true },
          },
        },
        take: 5,
        orderBy: {
          id: "asc",
        },
      });
    } else {
      const matchingUsers = await prisma.hobby.findMany({
        where: {
          name: { in: currentUserHobbies },
          userId: { notIn: [...blockedUserIds, ...followedUserIds, userId] },
        },
        select: {
          user: {
            select: {
              id: true,
              username: true,
              nickname: true,
              hobbies: {
                select: { name: true },
              },
              isRedFlagged: true,
            },
          },
        },
        distinct: ["userId"],
        take: 5,
      });

      recommendedUsers = matchingUsers
        .map((hobby) => hobby.user)
        .filter((user) => !user.isRedFlagged);

      if (recommendedUsers.length < 5) {
        console.log(
          "Not enough users with matching hobbies, recommending users from shared comments"
        );
        const remainingCount = 5 - recommendedUsers.length;

        const userComments = await prisma.comment.findMany({
          where: { authorId: userId },
          select: { postId: true },
          take: 10,
        });
        const userPostIds = userComments.map((comment) => comment.postId);

        if (userPostIds.length > 0) {
          const sharedCommentUsers = await prisma.comment.findMany({
            where: {
              postId: { in: userPostIds },
              authorId: {
                notIn: [...blockedUserIds, ...followedUserIds, userId],
              },
            },
            select: {
              author: {
                select: {
                  id: true,
                  username: true,
                  nickname: true,
                  hobbies: {
                    select: { name: true },
                  },
                  isRedFlagged: true,
                },
              },
            },
            distinct: ["authorId"],
            take: remainingCount,
          });

          const additionalUsers = sharedCommentUsers
            .map((comment) => comment.author)
            .filter((user) => !user.isRedFlagged);
          recommendedUsers = [
            ...recommendedUsers,
            ...additionalUsers.filter(
              (user) => !recommendedUsers.some((u) => u.id === user.id)
            ),
          ].slice(0, 5);
        }

        if (recommendedUsers.length < 5) {
          const remainingCountFinal = 5 - recommendedUsers.length;
          const randomUsers = await prisma.user.findMany({
            where: {
              id: {
                notIn: [
                  ...blockedUserIds,
                  ...followedUserIds,
                  ...recommendedUsers.map((u) => u.id),
                ],
              },
              isRedFlagged: false,
            },
            select: {
              id: true,
              username: true,
              nickname: true,
              hobbies: {
                select: { name: true },
              },
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

    // 格式化 hobbies 為陣列
    recommendedUsers = recommendedUsers.map((user) => ({
      ...user,
      hobbies: user.hobbies.map((hobby) => hobby.name),
    }));

    await redis.set(cacheKey, recommendedUsers, { ex: 1800 });
    console.log("Recommendations cached successfully");

    const endTime = performance.now();
    console.log(`Total response time: ${(endTime - startTime).toFixed(2)}ms`);

    return NextResponse.json({ users: recommendedUsers }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/recommend-users:", error);
    return NextResponse.json(
      { message: "Server error: " + error.message },
      { status: 500 }
    );
  }
}

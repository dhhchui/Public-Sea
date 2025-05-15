import prisma from "../../../lib/prisma";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export async function POST(request) {
  console.log("Received POST request to /api/search-users");
  const startTime = performance.now();

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No token provided");
      return NextResponse.json(
        { message: "No token provided" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    console.log("Verifying JWT...");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const { query } = await request.json();
    if (!query) {
      console.log("Missing query");
      return NextResponse.json(
        { message: "請輸入搜尋關鍵字" },
        { status: 400 }
      );
    }

    // 獲取當前用戶的好友和封鎖列表
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { friends: true },
    });

    if (!currentUser) {
      console.log("User not found");
      return NextResponse.json({ message: "用戶不存在" }, { status: 404 });
    }

    // 獲取當前用戶封鎖的用戶 ID
    const blockedUsers = await prisma.block.findMany({
      where: { blockerId: userId },
      select: { blockedId: true },
    });
    const blockedIds = blockedUsers.map((block) => block.blockedId);

    // 模糊搜尋用戶，排除自己、好友和封鎖用戶
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { nickname: { contains: query, mode: "insensitive" } }, // 模糊搜尋 nickname
          { email: { contains: query, mode: "insensitive" } }, // 模糊搜尋 email
        ],
        AND: [
          { id: { not: userId } }, // 排除自己
          { id: { notIn: currentUser.friends } }, // 排除已為好友的用戶
          { id: { notIn: blockedIds } }, // 排除封鎖用戶
        ],
      },
      select: {
        id: true,
        nickname: true,
        email: true,
      },
      take: 10, // 限制最多返回 10 個結果
    });

    const endTime = performance.now();
    console.log(`Total response time: ${(endTime - startTime).toFixed(2)}ms`);
    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error("Error in POST /api/search-users:", error);
    return NextResponse.json(
      { message: "伺服器錯誤: " + error.message },
      { status: 500 }
    );
  }
}

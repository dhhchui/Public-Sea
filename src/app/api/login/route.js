import prisma from "../../../lib/prisma";
import * as argon2 from "argon2";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import dotenv from "dotenv";

// 加載環境變數
dotenv.config();

export async function POST(request) {
  console.log("Received POST request to /api/login");
  console.log("JWT_SECRET in API route:", process.env.JWT_SECRET);

  // 檢查請求體
  let data;
  try {
    data = await request.json();
    console.log("Request body:", data);
  } catch (error) {
    console.error("Error parsing request body:", error);
    return NextResponse.json({ message: "無效的請求體" }, { status: 400 });
  }

  const { usernameOrEmail, password } = data;

  // 驗證必要字段
  if (!usernameOrEmail || !password) {
    console.log("缺少必要字段");
    return NextResponse.json({ message: "缺少用戶名/電子郵件或密碼" }, { status: 400 });
  }

  try {
    console.log("正在查找用戶...");
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
      },
    });

    if (!user) {
      console.log("用戶不存在");
      return NextResponse.json({ message: "用戶不存在" }, { status: 404 });
    }

    console.log("正在驗證密碼...");
    const passwordMatch = await argon2.verify(user.password, password);
    if (!passwordMatch) {
      console.log("密碼錯誤");
      return NextResponse.json({ message: "密碼錯誤" }, { status: 401 });
    }

    // 確保 JWT_SECRET 存在
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not defined");
      return NextResponse.json({ message: "伺服器配置錯誤" }, { status: 500 });
    }

    // 生成 JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    console.log("Generated JWT:", token);

    console.log("用戶登入成功:", user);
    return NextResponse.json({
      message: "登入成功",
      user: {
        userId: user.id,
        username: user.username,
        email: user.email,
        nickname: user.nickname,
        token, // 添加 token
      },
    }, { status: 200 });
  } catch (error) {
    console.error("POST /api/login 錯誤:", error);
    return NextResponse.json({ message: "伺服器錯誤" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
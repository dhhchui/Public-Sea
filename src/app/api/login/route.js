import prisma from "../../../lib/prisma";
import * as argon2 from "argon2";
import { NextResponse } from "next/server";
import { generateToken } from "@/lib/jwtUtils";

export async function POST(request) {
  console.log("Received POST request to /api/login");

  try {
    const { usernameOrEmail, password } = await request.json();
    console.log("Request body:", { usernameOrEmail, password });

    if (!usernameOrEmail || !password) {
      console.log("缺少必要字段");
      return NextResponse.json(
        { message: "缺少用戶名/電子郵件或密碼" },
        { status: 400 }
      );
    }

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

    const token = generateToken(user.id); // 使用 jwtUtils 生成 1 小時 token
    console.log("Generated JWT:", token);

    console.log("用戶登入成功:", user);
    return NextResponse.json(
      {
        message: "登入成功",
        user: {
          userId: user.id,
          username: user.username,
          email: user.email,
          nickname: user.nickname,
          token,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/login 錯誤:", error);
    return NextResponse.json({ message: "伺服器錯誤" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

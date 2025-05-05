import prisma from "../../../lib/prisma";
import * as argon2 from "argon2";

export async function POST(request) {
  console.log("收到 POST 請求至 /api/reset-password");

  let data;
  try {
    data = await request.json();
    console.log("請求內容:", data);
  } catch (error) {
    console.error("解析請求內容錯誤:", error);
    return new Response(JSON.stringify({ message: "無效的請求內容" }), {
      status: 400,
    });
  }

  const { userId, token, password } = data;

  // 檢查必要欄位
  if (!userId || !token || !password) {
    console.log("缺少必要欄位");
    return new Response(
      JSON.stringify({ message: "缺少必要欄位" }),
      { status: 400 }
    );
  }

  try {
    // 查找用戶
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
    });

    if (!user) {
      console.log("用戶不存在");
      return new Response(JSON.stringify({ message: "用戶不存在" }), {
        status: 404,
      });
    }

    // 驗證 token
    if (!user.resetPasswordToken || user.resetPasswordToken !== token) {
      console.log("無效的重設 token");
      return new Response(JSON.stringify({ message: "無效的重設 token" }), {
        status: 400,
      });
    }

    // 檢查 token 是否過期
    if (
      !user.resetPasswordExpires ||
      new Date() > new Date(user.resetPasswordExpires)
    ) {
      console.log("重設 token 已過期");
      return new Response(
        JSON.stringify({ message: "重設 token 已過期" }),
        { status: 400 }
      );
    }

    // 加密新密碼
    console.log("正在加密新密碼...");
    const hashedPassword = await argon2.hash(password);
    console.log("新密碼加密成功");

    // 更新用戶密碼並清除 token
    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    console.log("密碼重設成功");
    return new Response(
      JSON.stringify({ message: "密碼重設成功" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("處理 /api/reset-password 錯誤:", error);
    return new Response(JSON.stringify({ message: "伺服器錯誤" }), {
      status: 500,
    });
  }
}
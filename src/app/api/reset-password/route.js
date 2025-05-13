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

  const { username, password } = data;

  // 檢查必要欄位
  if (!username || !password) {
    console.log("缺少用戶名或密碼");
    return new Response(
      JSON.stringify({ message: "請提供用戶名和密碼" }),
      { status: 400 }
    );
  }

  try {
    // 查找用戶
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      console.log("用戶不存在");
      return new Response(JSON.stringify({ message: "用戶不存在" }), {
        status: 404,
      });
    }

    
    const passwordError = validatePassword(password);
    if (passwordError) {
      console.log("密碼格式無效");
      return new Response(JSON.stringify({ message: passwordError }), {
        status: 400,
      });
    }

    // 加密新密碼
    console.log("正在加密新密碼...");
    const hashedPassword = await argon2.hash(password);
    console.log("新密碼加密成功");

    // 更新用戶密碼
    await prisma.user.update({
      where: { username },
      data: {
        password: hashedPassword,
      },
    });

    console.log("密碼重設成功");
    return new Response(
      JSON.stringify({ message: "密碼重設成功，請使用新密碼登入" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("處理 /api/reset-password 錯誤:", error);
    return new Response(
      JSON.stringify({ message: "伺服器錯誤: " + error.message }),
      { status: 500 }
    );
  }
}


function validatePassword(password) {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  if (!hasUpperCase || !hasLowerCase) {
    return "密碼必須至少包含一個大寫字母和一個小寫字母。";
  }
  return "";
}
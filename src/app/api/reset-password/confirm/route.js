import prisma from "../../../../lib/prisma";
import * as argon2 from "argon2";

export async function POST(request) {
  console.log("收到 POST 請求至 /api/reset-password/confirm");

  try {
    let data;
    try {
      data = await request.json();
      console.log("請求內容:", data);
    } catch (error) {
      console.error("解析請求內容錯誤:", error);
      return new Response(JSON.stringify({ message: "無效的請求內容" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { email, token, password } = data;

    if (!email || !token || !password) {
      console.log("缺少必要欄位");
      return new Response(
        JSON.stringify({ message: "請提供電子郵件地址、令牌和新密碼" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log("用戶不存在");
      return new Response(JSON.stringify({ message: "用戶不存在" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (
      user.resetPasswordToken !== token ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      console.log("令牌無效或已過期");
      return new Response(JSON.stringify({ message: "令牌無效或已過期" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      console.log("密碼格式無效");
      return new Response(JSON.stringify({ message: passwordError }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("正在加密新密碼...");
    const hashedPassword = await argon2.hash(password);
    console.log("新密碼加密成功");

    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    console.log("密碼重設成功");
    return new Response(
      JSON.stringify({ message: "密碼重設成功，請使用新密碼登入" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("處理 /api/reset-password/confirm 錯誤:", error);
    return new Response(
      JSON.stringify({ message: "伺服器錯誤: " + error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

function validatePassword(password) {
  if (password.includes(" ")) {
    return "密碼不能包含空格";
  }
  if (password.length < 8) {
    return "密碼必須至少 8 個字符";
  }
  if (password.length > 24) {
    return "密碼不能超過 24 個字符";
  }
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
    return "密碼必須至少包含一個大寫字母、一個小寫字母、一個數字和一個特別符號";
  }
  return "";
}

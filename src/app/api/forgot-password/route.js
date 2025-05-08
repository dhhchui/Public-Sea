import prisma from "../../../lib/prisma";
import { randomUUID } from "crypto";

// 模擬發送郵件函數
async function sendResetPasswordEmail(email, token, userId) {
  const resetLink = `http://localhost:3000/reset-password?id=${userId}&token=${token}`;
  console.log(`模擬發送郵件至 ${email}，重設密碼鏈接：${resetLink}`);
}

export async function POST(request) {
  console.log("收到 POST 請求至 /api/forgot-password");

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

  const { email } = data;

  if (!email) {
    console.log("缺少電子郵件欄位");
    return new Response(
      JSON.stringify({ message: "請提供電子郵件地址" }),
      { status: 400 }
    );
  }

  // 生成模擬 token 和過期時間
  const token = randomUUID();
  const expires = new Date(Date.now() + 3600 * 1000); // 1小時後過期

  // 模擬用戶驗證
  if (email === "test@test.com") {
    console.log("模擬成功：用戶存在，發送郵件");
    await sendResetPasswordEmail(email, token, 1); // 模擬 userId 為 1
    return new Response(
      JSON.stringify({ message: "已發送重設密碼郵件，請檢查您的電子郵件" }),
      { status: 200 }
    );
  } else {
    console.log("模擬失敗：用戶不存在");
    return new Response(
      JSON.stringify({ message: "此電子郵件地址未註冊" }),
      { status: 404 }
    );
  }
}
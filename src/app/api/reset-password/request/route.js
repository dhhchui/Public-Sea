import prisma from "../../../../lib/prisma";
import crypto from "crypto";
import nodemailer from "nodemailer";

export async function POST(request) {
  console.log("收到 POST 請求至 /api/reset-password/request");

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

  // 檢查必要欄位
  if (!email) {
    console.log("缺少電子郵件地址");
    return new Response(JSON.stringify({ message: "請提供電子郵件地址" }), {
      status: 400,
    });
  }

  try {
    // 查找用戶
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log("用戶不存在");
      return new Response(JSON.stringify({ message: "用戶不存在" }), {
        status: 404,
      });
    }

    // 生成重設令牌
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000; // 令牌有效期 1 小時

    // 更新用戶的令牌和過期時間
    await prisma.user.update({
      where: { email },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: new Date(resetTokenExpiry),
      },
    });

    // 設置電子郵件傳輸
    const transporter = nodemailer.createTransport({
      service: "Gmail", // 可以使用其他服務，例如 SendGrid
      auth: {
        user: process.env.EMAIL_USER, // 你的電子郵件地址
        pass: process.env.EMAIL_PASS, // 你的應用程式密碼（不是帳戶密碼）
      },
    });

    // 構建重設連結
    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}&email=${encodeURIComponent(
      email
    )}`;

    // 發送電子郵件
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "密碼重設請求 - Public Sea",
      text: `您好，\n\n您已請求重設 Public Sea 帳戶的密碼。請點擊以下連結來重設您的密碼（連結有效期為 1 小時）：\n\n${resetLink}\n\n如果您沒有發起此請求，請忽略此郵件。\n\n祝好，\nPublic Sea 團隊`,
      html: `
        <h2>密碼重設請求</h2>
        <p>您好，</p>
        <p>您已請求重設 Public Sea 帳戶的密碼。請點擊以下連結來重設您的密碼（連結有效期為 1 小時）：</p>
        <p><a href="${resetLink}" style="color: #1a73e8; text-decoration: none;">點擊這裡重設密碼</a></p>
        <p>如果您沒有發起此請求，請忽略此郵件。</p>
        <p>祝好，<br>Public Sea 團隊</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("密碼重設郵件已發送至:", email);

    return new Response(
      JSON.stringify({ message: "密碼重設連結已發送至您的電子郵件" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("處理 /api/reset-password/request 錯誤:", error);
    return new Response(
      JSON.stringify({ message: "伺服器錯誤: " + error.message }),
      { status: 500 }
    );
  }
}

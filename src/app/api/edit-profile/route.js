import prisma from "../../../lib/prisma";
import jwt from "jsonwebtoken";
import * as argon2 from "argon2";

export async function PATCH(request) {
  console.log("Received PATCH request to /api/edit-profile");

  try {
    // 從請求頭中提取 JWT
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No token provided");
      return new Response(JSON.stringify({ message: "No token provided" }), {
        status: 401,
      });
    }

    const token = authHeader.split(" ")[1];
    console.log("Verifying JWT...");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let data;
    try {
      data = await request.json();
      console.log("Request body:", data);
    } catch (error) {
      console.error("Error parsing request body:", error);
      return new Response(JSON.stringify({ message: "Invalid request body" }), {
        status: 400,
      });
    }

    const { nickname, password, confirmPassword, bio, hobbies } = data;

    // 驗證必填欄位
    if (!nickname) {
      console.log("Missing required field: nickname");
      return new Response(JSON.stringify({ message: "Nickname is required" }), {
        status: 400,
      });
    }

    // 檢查 nickname 是否包含禁止的關鍵字
    const forbiddenKeywords = [
      "admin",
      "administrator",
      "select",
      "insert",
      "update",
      "delete",
      "drop",
      "create",
      "alter",
      "truncate",
      "union",
      "join",
      "where",
      "from",
      "into",
      "exec",
      "execute",
    ];

    const nicknameLower = nickname.toLowerCase();
    const containsForbiddenKeyword = (value) =>
      forbiddenKeywords.some((keyword) => value.includes(keyword));

    if (containsForbiddenKeyword(nicknameLower)) {
      console.log("Nickname contains forbidden keyword");
      return new Response(
        JSON.stringify({
          message: 'Nickname cannot contain "Admin" or SQL keywords',
        }),
        { status: 400 }
      );
    }

    // 準備更新數據
    const updateData = { nickname, bio, hobbies };

    // 如果提供了新密碼，則哈希並更新
    if (password) {
      if (password !== confirmPassword) {
        console.log("Passwords do not match");
        return new Response(
          JSON.stringify({ message: "Passwords do not match" }),
          { status: 400 }
        );
      }

      console.log("Hashing new password...");
      const hashedPassword = await argon2.hash(password);
      updateData.password = hashedPassword;
      console.log("Password hashed successfully");
    }

    console.log("Updating user in database...");
    const user = await prisma.user.update({
      where: { id: decoded.userId },
      data: updateData,
    });
    console.log("User updated successfully:", user);

    return new Response(
      JSON.stringify({
        message: "Profile updated successfully",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          nickname: user.nickname,
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in PATCH /api/edit-profile:", error);
    if (error.name === "JsonWebTokenError") {
      console.log("Invalid token");
      return new Response(JSON.stringify({ message: "Invalid token" }), {
        status: 401,
      });
    }
    if (error.code === "P2002") {
      console.log("Nickname already exists");
      return new Response(
        JSON.stringify({ message: "Nickname already exists" }),
        { status: 400 }
      );
    }
    return new Response(JSON.stringify({ message: "Server error" }), {
      status: 500,
    });
  }
}

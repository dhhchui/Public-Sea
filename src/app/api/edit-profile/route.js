import prisma from "../../../lib/prisma";
import jwt from "jsonwebtoken";
import * as argon2 from "argon2";

export async function PATCH(request) {
  console.log("Received PATCH request to /api/edit-profile");

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No token provided");
      return new Response(JSON.stringify({ message: "No token provided" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
      });
    }

    let { nickname, oldPassword, password, confirmPassword, bio, hobbies } =
      data;

    if (!nickname) {
      console.log("Missing required field: nickname");
      return new Response(JSON.stringify({ message: "Nickname is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 修剪 nickname 和 password（如果存在），移除前後空格
    nickname = nickname.trim();
    if (password) {
      password = password.trim();
      confirmPassword = confirmPassword.trim();
      oldPassword = oldPassword ? oldPassword.trim() : "";
    }

    // 檢查 nickname 是否包含空白字符
    if (/\s/.test(nickname)) {
      console.log("Nickname contains whitespace characters:", nickname);
      return new Response(
        JSON.stringify({
          message: "Nickname cannot contain spaces or whitespace characters",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (nickname.length < 3) {
      console.log("Nickname is too short");
      return new Response(
        JSON.stringify({
          message: "Nickname must be at least 3 characters long",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

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
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const updateData = { nickname, bio };
    let logoutRequired = false;

    // 處理 hobbies
    if (hobbies) {
      if (!Array.isArray(hobbies)) {
        console.log("Invalid hobbies format:", hobbies);
        return new Response(
          JSON.stringify({ message: "Hobbies must be an array" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // 移除現有的 Hobby 記錄
      console.log("Deleting existing hobbies for user:", decoded.userId);
      await prisma.hobby.deleteMany({
        where: { userId: decoded.userId },
      });

      // 創建新的 Hobby 記錄（如果有 hobbies 數據）
      if (hobbies.length > 0) {
        console.log("Creating new hobbies for user:", decoded.userId);
        updateData.hobbies = {
          create: hobbies.map((hobby) => ({
            name: hobby.trim(),
          })),
        };
      }
    }

    if (password) {
      if (password !== confirmPassword) {
        console.log("Passwords do not match");
        return new Response(
          JSON.stringify({ message: "Passwords do not match" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (/\s/.test(password)) {
        console.log("Password contains whitespace characters:", password);
        return new Response(
          JSON.stringify({
            message: "Password cannot contain spaces or whitespace characters",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (password.length < 8) {
        console.log("Password is too short");
        return new Response(
          JSON.stringify({
            message: "Password must be at least 8 characters long",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (password.length > 24) {
        console.log("Password is too long");
        return new Response(
          JSON.stringify({ message: "Password cannot exceed 24 characters" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const hasLetter = /[a-zA-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      if (!hasLetter || !hasNumber) {
        console.log("Password must contain both letters and numbers");
        return new Response(
          JSON.stringify({
            message: "Password must contain both letters and numbers",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // 驗證舊密碼
      if (!oldPassword) {
        console.log("Old password is required");
        return new Response(
          JSON.stringify({ message: "Please provide your old password" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      console.log("Fetching user to verify old password...");
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { password: true },
      });

      if (!user) {
        console.log("User not found");
        return new Response(JSON.stringify({ message: "User not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log("Verifying old password...");
      const isOldPasswordValid = await argon2.verify(
        user.password,
        oldPassword
      );
      if (!isOldPasswordValid) {
        console.log("Old password is incorrect");
        return new Response(
          JSON.stringify({ message: "Old password is incorrect" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      console.log("Hashing new password...");
      const hashedPassword = await argon2.hash(password);
      updateData.password = hashedPassword;
      console.log("Password hashed successfully");
      logoutRequired = true;
    }

    console.log("Updating user in database...");
    const updatedUser = await prisma.user.update({
      where: { id: decoded.userId },
      data: updateData,
    });
    console.log("User updated successfully:", updatedUser);

    return new Response(
      JSON.stringify({
        message: "Profile updated successfully",
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          nickname: updatedUser.nickname,
        },
        logoutRequired,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in PATCH /api/edit-profile:", error);
    if (error.name === "JsonWebTokenError") {
      console.log("Invalid token");
      return new Response(JSON.stringify({ message: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (error.code === "P2002") {
      console.log("Nickname already exists");
      return new Response(
        JSON.stringify({ message: "Nickname already exists" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ message: "Server error: " + error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

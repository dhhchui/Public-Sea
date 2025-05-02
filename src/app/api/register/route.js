import prisma from "../../../lib/prisma";
import * as argon2 from "argon2";

export async function POST(request) {
  console.log("Received POST request to /api/register");

  // 檢查請求體
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

  const {
    username,
    email,
    password,
    nickname,
    gender,
    hobbies,
  } = data;

  // 驗證必要字段
  if (
    !username ||
    !email ||
    !password ||
    !nickname
  ) {
    console.log("Missing required fields");
    return new Response(
      JSON.stringify({ message: "Missing required fields" }),
      { status: 400 }
    );
  }

  try {
    console.log("Hashing password...");
    const hashedPassword = await argon2.hash(password);
    console.log("Password hashed successfully");

    console.log("Creating user in database...");
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        nickname,
        gender: gender || "undisclosed",
        hobbies: hobbies || [],
        followerCount: 0,
        followedCount: 0,
        followerIds: [],
        followedIds: [],
      },
    });
    console.log("User created successfully:", user);

    return new Response(
      JSON.stringify({
        message: "User registered successfully",
        user: { id: user.id, username, email, nickname },
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/register:", error);
    // 處理唯一性約束錯誤（例如 username 或 email 已存在）
    if (error.code === "P2002") {
      return new Response(
        JSON.stringify({ message: "Username or email already exists" }),
        { status: 400 }
      );
    }
    // 其他錯誤
    return new Response(JSON.stringify({ message: "Server error" }), {
      status: 500,
    });
  }
}

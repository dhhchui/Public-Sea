import prisma from "../../../lib/prisma";
import * as argon2 from "argon2";

export async function POST(request) {
  console.log("Received POST request to /api/register");

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

  const { username, email, password, confirmPassword, nickname, gender } = data;

  if (!username || !email || !password || !confirmPassword || !nickname) {
    console.log("Missing required fields");
    return new Response(
      JSON.stringify({ message: "Missing required fields" }),
      { status: 400 }
    );
  }

  // 檢查 Email 格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.log("Invalid email format");
    return new Response(JSON.stringify({ message: "Invalid email format" }), {
      status: 400,
    });
  }

  // 檢查 Email 長度（避免過長）
  if (email.length > 255) {
    console.log("Email is too long");
    return new Response(
      JSON.stringify({ message: "Email is too long (max 255 characters)" }),
      { status: 400 }
    );
  }

  // 檢查 Email 是否包含禁用關鍵字
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

  const containsForbiddenKeyword = (value) =>
    forbiddenKeywords.some((keyword) => value.toLowerCase().includes(keyword));

  if (containsForbiddenKeyword(email)) {
    console.log("Email contains forbidden keyword");
    return new Response(
      JSON.stringify({
        message: 'Email cannot contain "Admin" or SQL keywords',
      }),
      { status: 400 }
    );
  }

  // 檢查密碼是否一致
  if (password !== confirmPassword) {
    console.log("Passwords do not match");
    return new Response(JSON.stringify({ message: "Passwords do not match" }), {
      status: 400,
    });
  }

  // 檢查密碼長度（8-24 字符）
  if (password.length < 8 || password.length > 24) {
    console.log("Password length is invalid");
    return new Response(
      JSON.stringify({
        message: "Password must be between 8 and 24 characters long.",
      }),
      { status: 400 }
    );
  }

  // 檢查密碼是否包含空格
  if (/\s/.test(password)) {
    console.log("Password contains spaces");
    return new Response(
      JSON.stringify({
        message: "Password cannot contain spaces.",
      }),
      { status: 400 }
    );
  }

  // 檢查密碼強度（至少包含一個大寫字母、一個小寫字母和一個特殊符號）
  const passwordStrengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\W).+$/;
  if (!passwordStrengthRegex.test(password)) {
    console.log("Password is too weak");
    return new Response(
      JSON.stringify({
        message:
          "Password is too weak. It must contain at least one uppercase letter, one lowercase letter, and one special character.",
      }),
      { status: 400 }
    );
  }

  // 檢查 username 和 nickname 是否包含禁用關鍵字
  const usernameLower = username.toLowerCase();
  const nicknameLower = nickname.toLowerCase();

  if (containsForbiddenKeyword(usernameLower)) {
    console.log("Username contains forbidden keyword");
    return new Response(
      JSON.stringify({
        message: 'Username cannot contain "Admin" or SQL keywords',
      }),
      { status: 400 }
    );
  }

  if (containsForbiddenKeyword(nicknameLower)) {
    console.log("Nickname contains forbidden keyword");
    return new Response(
      JSON.stringify({
        message: 'Nickname cannot contain "Admin" or SQL keywords',
      }),
      { status: 400 }
    );
  }

  // 檢查 nickname 長度（考慮中文字符）
  const validateNicknameLength = (nickname) => {
    let totalLength = 0;
    for (const char of nickname) {
      if (/[\u4E00-\u9FFF]/.test(char)) {
        totalLength += 2;
      } else {
        totalLength += 1;
      }
    }
    if (totalLength > 18) {
      return "Nickname exceeds length limit: max 18 letters or 9 Chinese characters.";
    }
    return "";
  };

  const nicknameLengthError = validateNicknameLength(nickname);
  if (nicknameLengthError) {
    console.log("Nickname length validation failed");
    return new Response(JSON.stringify({ message: nicknameLengthError }), {
      status: 400,
    });
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
        hobbies: [],
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
    if (error.code === "P2002") {
      return new Response(
        JSON.stringify({ message: "Username or email already exists" }),
        { status: 400 }
      );
    }
    return new Response(JSON.stringify({ message: "Server error" }), {
      status: 500,
    });
  }
}

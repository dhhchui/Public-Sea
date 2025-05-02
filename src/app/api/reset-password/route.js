import prisma from "../../../lib/prisma";
import * as argon2 from "argon2";

export async function POST(request) {
  console.log("Received POST request to /api/reset-password"); // 修正日誌訊息

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

  const { userId, token, password } = data;

  if (!userId || !token || !password) {
    console.log("Missing required fields");
    return new Response(
      JSON.stringify({ message: "Missing required fields" }),
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
    });

    if (!user) {
      console.log("User not found");
      return new Response(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    if (!user.resetPasswordToken || user.resetPasswordToken !== token) {
      console.log("Invalid reset token");
      return new Response(JSON.stringify({ message: "Invalid reset token" }), {
        status: 400,
      });
    }

    if (
      !user.resetPasswordExpires ||
      new Date() > new Date(user.resetPasswordExpires)
    ) {
      console.log("Reset token expired");
      return new Response(
        JSON.stringify({ message: "Reset token has expired" }),
        { status: 400 }
      );
    }

    console.log("Hashing new password...");
    const hashedPassword = await argon2.hash(password);
    console.log("Password hashed successfully");

    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return new Response(
      JSON.stringify({ message: "Password reset successfully" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in POST /api/reset-password:", error);
    return new Response(JSON.stringify({ message: error.message }), {
      status: 500,
    });
  }
}

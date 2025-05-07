import dotenv from "dotenv";
import prisma from "../../../lib/prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

dotenv.config();

export async function PATCH(request) {
  console.log("JWT_SECRET in API route:", process.env.JWT_SECRET);

  try {
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
    console.log("Decoded token:", decoded);

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

    const { nickname, bio, hobbies, password, confirmPassword } = data;

    if (password && password !== confirmPassword) {
      console.log("Passwords do not match");
      return new Response(JSON.stringify({ message: "Passwords do not match" }), {
        status: 400,
      });
    }

    const userId = decoded.userId;
    const updateData = {
      ...(nickname && { nickname }),
      ...(bio && { bio }),
      ...(hobbies && { hobbies: typeof hobbies === "string" ? [hobbies] : hobbies }), // 將字符串轉為數組
      ...(password && { password: await bcrypt.hash(password, 10) }),
    };

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        nickname: true,
        bio: true,
        hobbies: true,
      },
    });

    console.log("User updated successfully:", user);
    return new Response(JSON.stringify({ user }), { status: 200 });
  } catch (error) {
    console.error("Error in PATCH /api/edit-profile:", error);
    if (error.name === "JsonWebTokenError") {
      console.log("Invalid token");
      return new Response(JSON.stringify({ message: "Invalid token" }), {
        status: 401,
      });
    }
    return new Response(JSON.stringify({ message: "Server error: " + error.message }), {
      status: 500,
    });
  }
}
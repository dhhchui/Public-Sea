import prisma from "../../../lib/prisma";
import * as argon2 from "argon2";
import jwt from "jsonwebtoken";

export async function POST(request) {
  const { username, password } = await request.json();

  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return new Response(JSON.stringify({ message: "Invalid credentials" }), {
        status: 401,
      });
    }

    const isValid = await argon2.verify(user.password, password);
    if (!isValid) {
      return new Response(JSON.stringify({ message: "Invalid credentials" }), {
        status: 401,
      });
    }

    const token = jwt.sign({ userId: user.id }, "your_jwt_secret", {
      expiresIn: "1h",
    });
    return new Response(
      JSON.stringify({
        message: "Login successful",
        token,
        user: {
          id: user.id,
          username,
          email: user.email,
          nickname: user.nickname,
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    return new Response(JSON.stringify({ message: "Server error" }), {
      status: 500,
    });
  }
}

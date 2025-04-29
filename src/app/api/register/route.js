import prisma from "../../../lib/prisma";
import * as argon2 from "argon2";

export async function POST(request) {
  const data = await request.json();
  const { username, email, password, firstname, lastname, nickname, gender } =
    data;

  try {
    const hashedPassword = await argon2.hash(password);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        firstname,
        lastname,
        nickname,
        gender: gender || "undisclosed",

        followerCount: 0,
        followedCount: 0,
        followerIds: [],
        followedIds: [],
      },
    });
    return new Response(
      JSON.stringify({
        message: "User registered successfully",
        user: { id: user.id, username, email, nickname },
      }),
      { status: 201 }
    );
  } catch (error) {
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

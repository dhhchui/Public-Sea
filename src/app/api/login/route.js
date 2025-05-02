import prisma from "../../../lib/prisma";
import * as argon2 from "argon2";

export async function POST(request) {
  console.log("Received POST request to /api/login");

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

  const { usernameOrEmail, password } = data;

  if (!usernameOrEmail || !password) {
    console.log("Missing required fields");
    return new Response(
      JSON.stringify({ message: "Missing required fields" }),
      { status: 400 }
    );
  }

  try {
    console.log("Finding user in database...");
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
      },
    });

    if (!user) {
      console.log("User not found");
      return new Response(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    console.log("Verifying password...");
    const passwordMatch = await argon2.verify(user.password, password);
    if (!passwordMatch) {
      console.log("Invalid password");
      return new Response(JSON.stringify({ message: "Invalid password" }), {
        status: 401,
      });
    }

    console.log("User logged in successfully:", user);
    return new Response(
      JSON.stringify({
        message: "Login successful",
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
    console.error("Error in POST /api/login:", error);
    return new Response(JSON.stringify({ message: "Server error" }), {
      status: 500,
    });
  }
}

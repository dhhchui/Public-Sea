import prisma from "../../../lib/prisma";

export async function GET(request) {
  console.log("Received GET request to /api/me");

  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      return new Response(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    return new Response(
      JSON.stringify({
        message: "User fetched successfully",
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
    console.error("Error in GET /api/me:", error);
    return new Response(JSON.stringify({ message: "Server error" }), {
      status: 500,
    });
  }
}

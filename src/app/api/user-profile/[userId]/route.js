import prisma from "../../../../lib/prisma";

export async function GET(request, { params }) {
  console.log("Received GET request to /api/user-profile/[userId]");

  try {
    const { userId } = await params;
    const userIdInt = parseInt(userId);

    if (isNaN(userIdInt)) {
      console.log("Invalid user ID");
      return new Response(JSON.stringify({ message: "Invalid user ID" }), {
        status: 400,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userIdInt },
      select: {
        id: true,
        username: true,
        nickname: true,
        bio: true,
        hobbies: true,
        followerCount: true,
        followedCount: true,
        followerIds: true,
        followedIds: true,
        rating: true, // 已包含
        isRedFlagged: true, // 已包含
      },
    });

    if (!user) {
      console.log("User not found");
      return new Response(JSON.stringify({ message: "User not found" }), {
        status: 404,
      });
    }

    return new Response(JSON.stringify({ user }), { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/user-profile/[userId]:", error);
    return new Response(
      JSON.stringify({ message: "Server error: " + error.message }),
      { status: 500 }
    );
  }
}

export async function OPTIONS(request) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

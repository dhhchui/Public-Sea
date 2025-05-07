import prisma from "../../../../lib/prisma";
import jwt from "jsonwebtoken";

export async function GET(request) {
  console.log("Received GET request to /api/friend-request/list");

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
    const userId = decoded.userId;

    const friendRequests = await prisma.friendRequest.findMany({
      where: {
        receiverId: userId,
        status: "pending",
      },
      include: {
        sender: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return new Response(JSON.stringify({ requests: friendRequests }), {
      status: 200,
    });
  } catch (error) {
    console.error("Error in GET /api/friend-request/list:", error);
    return new Response(
      JSON.stringify({ message: "Server error: " + error.message }),
      { status: 500 }
    );
  }
}

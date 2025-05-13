import prisma from "../../../lib/prisma";
import jwt from "jsonwebtoken";

export async function GET(request) {
  console.log("Received GET request to /api/blocked-users");

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

    const blockedUsers = await prisma.block.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
    });

    const blockedList = blockedUsers.map((block) => ({
      id: block.blocked.id,
      nickname: block.blocked.nickname,
    }));

    return new Response(JSON.stringify({ blockedList }), { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/blocked-users:", error);
    return new Response(
      JSON.stringify({ message: "Server error: " + error.message }),
      { status: 500 }
    );
  }
}

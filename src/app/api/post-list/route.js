import prisma from "../../../lib/prisma";
import jwt from "jsonwebtoken";

export async function GET(request) {
  console.log("Received GET request to /api/post-list");

  try {
    let userId = null;
    const authHeader = request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      console.log("Verifying JWT...");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.userId;
    }

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get("boardId");

    let where = {};
    if (boardId) {
      const boardIdInt = parseInt(boardId);
      if (isNaN(boardIdInt)) {
        console.log("Invalid boardId");
        return new Response(JSON.stringify({ message: "Invalid boardId" }), {
          status: 400,
        });
      }
      where.boardId = boardIdInt;
    }

    let blockedUsers = [];
    let usersWhoBlockedMe = [];
    if (userId) {
      const blockRecords = await prisma.block.findMany({
        where: { blockerId: userId },
        select: { blockedId: true },
      });
      blockedUsers = blockRecords.map((record) => record.blockedId);

      const blockedByRecords = await prisma.block.findMany({
        where: { blockedId: userId },
        select: { blockerId: true },
      });
      usersWhoBlockedMe = blockedByRecords.map((record) => record.blockerId);
    }

    const blockedUserIds = [...blockedUsers, ...usersWhoBlockedMe];
    if (blockedUserIds.length > 0) {
      where.authorId = { notIn: blockedUserIds };
    }

    const posts = await prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
    });

    const serializedPosts = posts.map((post) => ({
      ...post,
      view: post.view.toString(),
    }));

    return new Response(JSON.stringify({ posts: serializedPosts }), {
      status: 200,
    });
  } catch (error) {
    console.error("Error in GET /api/post-list:", error);
    return new Response(
      JSON.stringify({ message: "Server error: " + error.message }),
      { status: 500 }
    );
  }
}

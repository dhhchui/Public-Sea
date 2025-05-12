import prisma from "../../../../lib/prisma";
import jwt from "jsonwebtoken";

export async function GET(request, { params }) {
  console.log("Received GET request to /api/view-post/[postId]");

  try {
    console.log("DATABASE_URL:", process.env.DATABASE_URL);
    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL is not defined in environment variables");
      return new Response(
        JSON.stringify({
          message: "Server configuration error: Database URL is missing",
        }),
        { status: 500 }
      );
    }

    let userId = null;
    const authHeader = request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      console.log("Verifying JWT...");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.userId;
    }

    const { postId } = await params;
    const postIdInt = parseInt(postId);

    if (isNaN(postIdInt)) {
      console.log("Invalid postId:", postId);
      return new Response(JSON.stringify({ message: "Invalid postId" }), {
        status: 400,
      });
    }

    let blockedUsers = [];
    let usersWhoBlockedMe = [];
    if (userId) {
      try {
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
      } catch (dbError) {
        console.error("Database error while fetching block records:", dbError);
        return new Response(
          JSON.stringify({
            message: "Failed to fetch blocked users due to database error",
          }),
          { status: 503 }
        );
      }
    }

    let post;
    try {
      post = await prisma.post.findUnique({
        where: { id: postIdInt },
        include: {
          author: {
            select: {
              id: true,
              nickname: true,
              isRedFlagged: true,
            },
          },
          board: {
            select: {
              id: true,
              name: true,
            },
          },
          comments: {
            orderBy: { createdAt: "desc" },
            include: {
              author: {
                select: {
                  id: true,
                  nickname: true,
                  isRedFlagged: true,
                },
              },
            },
          },
        },
      });
    } catch (dbError) {
      console.error("Database error while fetching post:", dbError);
      return new Response(
        JSON.stringify({
          message: "Failed to fetch post due to database error",
        }),
        { status: 503 }
      );
    }

    if (!post) {
      console.log("Post not found");
      return new Response(JSON.stringify({ message: "Post not found" }), {
        status: 404,
      });
    }

    // 驗證 board 參數與 post.board.name 匹配
    const boardParam = request.url.match(/\/boards\/([^\/]+)/)?.[1];
    if (boardParam && decodeURIComponent(boardParam) !== post.board.name) {
      console.log("Post does not belong to the requested board:", {
        postIdInt,
        boardParam,
        postBoard: post.board.name,
      });
      return new Response(
        JSON.stringify({ message: "Post does not belong to the requested board" }),
        { status: 404 }
      );
    }

    if (userId) {
      const blockedUserIds = [...blockedUsers, ...usersWhoBlockedMe];
      if (blockedUserIds.includes(post.authorId)) {
        console.log("Post author is blocked or has blocked you");
        return new Response(
          JSON.stringify({
            message: "Post author is blocked or has blocked you",
          }),
          { status: 403 }
        );
      }

      post.comments = post.comments
        .map((comment) => {
          if (!comment.id || isNaN(comment.id)) {
            console.error("Invalid comment ID:", comment.id);
            return null;
          }
          if (blockedUserIds.includes(comment.authorId)) {
            return null;
          }
          return {
            ...comment,
            isCollapsed: comment.author.isRedFlagged,
          };
        })
        .filter((comment) => comment !== null);
    }

    try {
      await prisma.post.update({
        where: { id: postIdInt },
        data: {
          view: { increment: 1 },
        },
      });
    } catch (dbError) {
      console.error("Database error while updating view count:", dbError);
    }

    const serializedPost = {
      ...post,
      view: post.view.toString(),
      board: undefined, 
    };

    return new Response(JSON.stringify({ post: serializedPost }), {
      status: 200 },
    );
  } catch (error) {
    console.error("Error in GET /api/view-post/[postId]:", error);
    return new Response(
      JSON.stringify({ message: "Server error: " + error.message }),
      { status: 500 }
    );
  }
}
/* import prisma from "@/lib/prisma.js";

export async function GET(request, { params }) {
  console.log("Received GET request to /api/boards/[board]/posts/[postId]", { params });

  try {
    const { board, postId } = await params;
    const postIdInt = parseInt(postId);

    if (isNaN(postIdInt)) {
      console.log("無效的貼文 ID:", postId);
      return new Response(JSON.stringify({ message: "無效的貼文 ID" }), {
        status: 400,
      });
    }

    if (!board || typeof board !== "string") {
      console.log("無效的討論區 name:", board);
      return new Response(JSON.stringify({ message: "無效的討論區" }), {
        status: 400,
      });
    }

    const post = await prisma.post.findUnique({
      where: { id: postIdInt },
      include: {
        author: {
          select: {
            id: true,
            username: true,
          },
        },
        board: {
          select: {
            name: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!post) {
      console.log("找不到貼文，ID:", postIdInt);
      return new Response(JSON.stringify({ message: "找不到貼文" }), {
        status: 404,
      });
    }

    if (post.board.name !== board) {
      console.log("貼文不屬於此討論區:", { postIdInt, board, postBoard: post.board.name });
      return new Response(JSON.stringify({ message: "貼文不屬於此討論區" }), {
        status: 404,
      });
    }

    await prisma.post.update({
      where: { id: postIdInt },
      data: { view: { increment: 1 } },
    });

    const serializedPost = {
      ...post,
      view: post.view.toString(),
      comments: post.comments.map((comment) => ({
        ...comment,
        likeCount: comment.likeCount.toString(),
      })),
      board: undefined, // 移除 board 資料
    };

    return new Response(JSON.stringify({ post: serializedPost }), {
      status: 200,
    });
  } catch (error) {
    console.error("錯誤處理 GET /api/boards/[board]/posts/[postId]:", error);
    return new Response(
      JSON.stringify({ message: "伺服器錯誤: " + error.message }),
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
} */
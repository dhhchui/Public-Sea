import prisma from "../../../lib/prisma";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const board = searchParams.get("board");

    if (!board) {
      return new Response(
        JSON.stringify({ message: "Board parameter is required" }),
        { status: 400 }
      );
    }

    const posts = await prisma.post.findMany({
      where: {
        category: board,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            nickname: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 轉換 BigInt 為字符串
    const postsWithStringViews = posts.map((post) => ({
      ...post,
      view: post.view.toString(),
    }));

    return new Response(
      JSON.stringify({
        posts: postsWithStringViews,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching posts:", error);
    return new Response(JSON.stringify({ message: "Server error" }), {
      status: 500,
    });
  }
}

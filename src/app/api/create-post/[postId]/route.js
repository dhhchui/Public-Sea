import prisma from "../../../../lib/prisma";

export async function GET(request, { params }) {
  try {
    const { postId } = params;

    const post = await prisma.post.findUnique({
      where: {
        id: parseInt(postId),
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
    });

    if (!post) {
      return new Response(JSON.stringify({ message: "Post not found" }), {
        status: 404,
      });
    }

    // 更新瀏覽次數
    await prisma.post.update({
      where: { id: post.id },
      data: { view: post.view + BigInt(1) },
    });

    // 轉換 BigInt 為字符串
    const postWithStringViews = {
      ...post,
      view: post.view.toString(),
    };

    return new Response(
      JSON.stringify({
        post: postWithStringViews,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching post:", error);
    return new Response(JSON.stringify({ message: "Server error" }), {
      status: 500,
    });
  }
}

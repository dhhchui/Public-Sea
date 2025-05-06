import prisma from "../../../lib/prisma";

export async function GET(request) {
  console.log("Received GET request to /api/popular-posts");

  try {
    const posts = await prisma.post.findMany({
      take: 20,
      orderBy: { view: "desc" },
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
    console.error("Error in GET /api/popular-posts:", error);
    return new Response(
      JSON.stringify({ message: "Server error: " + error.message }),
      { status: 500 }
    );
  }
}

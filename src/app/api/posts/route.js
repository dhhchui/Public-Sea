import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const board = searchParams.get("board");
    const page = parseInt(searchParams.get("page")) || 1;
    const pageSize = parseInt(searchParams.get("pageSize")) || 10;

    console.log("Received GET /api/posts:", { board, page, pageSize });

    if (!board) {
      console.log("No board parameter provided");
      return new Response(JSON.stringify({ message: "未提供分台參數" }), {
        status: 400,
      });
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: { board },
        include: { author: { select: { username: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.post.count({ where: { board } }),
    ]);

    console.log("Fetched posts:", posts.length);

    const serializedPosts = posts.map((post) => ({
      ...post,
      view: Number(post.view),
      likeCount: Number(post.likeCount),
      createdAt: post.createdAt.toISOString(),
    }));

    return new Response(
      JSON.stringify({ 
        posts: serializedPosts,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      }), 
      { status: 200 }
    );
  } catch (error) {
    console.error("查詢話題失敗:", error);
    return new Response(JSON.stringify({ message: "伺服器錯誤" }), {
      status: 500,
    });
  }
}
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const board = searchParams.get("board");

    console.log("Received GET /api/posts:", { board });

    if (!board) {
      console.log("No board parameter provided");
      return new Response(JSON.stringify({ message: "未提供分台參數" }), {
        status: 400,
      });
    }

    const posts = await prisma.post.findMany({
      where: { board },
      include: { author: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
    });

    console.log("Fetched posts:", posts.length);

    // 將 BigInt 轉為 Number 以序列化
    const serializedPosts = posts.map((post) => ({
      ...post,
      view: Number(post.view),
    }));

    return new Response(JSON.stringify({ posts: serializedPosts }), { status: 200 });
  } catch (error) {
    console.error("查詢話題失敗:", error);
    return new Response(JSON.stringify({ message: "伺服器錯誤" }), {
      status: 500,
    });
  }
}
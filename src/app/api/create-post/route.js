import { PrismaClient } from "@prisma/client";
import { navMain } from "@/lib/boards";

const prisma = new PrismaClient();

// 獲取所有有效的 board slug
const validBoards = navMain.flatMap((category) =>
  category.items.map((board) => board.slug)
);

export async function POST(request) {
  try {
    const { title, content, board, authorId } = await request.json();

    console.log("Received POST /api/create-post:", { title, content, board, authorId });

    if (!title || !content || !title.trim() || !content.trim()) {
      console.log("Invalid title or content");
      return new Response(JSON.stringify({ message: "標題和內容不能為空" }), {
        status: 400,
      });
    }

    if (!board || !validBoards.includes(board)) {
      console.log("Invalid board:", board);
      return new Response(JSON.stringify({ message: "無效的分台" }), {
        status: 400,
      });
    }

    if (!authorId) {
      console.log("No authorId provided");
      return new Response(JSON.stringify({ message: "未提供用戶ID" }), {
        status: 400,
      });
    }

    const post = await prisma.post.create({
      data: {
        title,
        content,
        board,
        authorId,
        view: 0,
        likeCount: 0,
      },
    });

    console.log("Post created:", post);

    // 將 BigInt 轉為 Number 以序列化
    const serializedPost = {
      ...post,
      view: Number(post.view),
    };

    return new Response(JSON.stringify({ post: serializedPost }), { status: 200 });
  } catch (error) {
    console.error("創建話題失敗:", error);
    return new Response(JSON.stringify({ message: "伺服器錯誤" }), {
      status: 500,
    });
  }
}
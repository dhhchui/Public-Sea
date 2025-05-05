import { PrismaClient } from "@prisma/client";
import { navMain } from "@/lib/boards";

const prisma = new PrismaClient();

// Get all valid board slugs
const validBoards = navMain.flatMap((category) =>
  category.items.map((board) => board.slug)
);

export async function POST(request) {
  try {
    const { title, content, board, authorId } = await request.json();

    console.log("Received POST /api/create-post:", { title, content, board, authorId });

    // Validate input
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

    // 驗證用戶是否存在
    const userExists = await prisma.user.findUnique({
      where: { id: parseInt(authorId) },
    });

    if (!userExists) {
      console.log("User does not exist:", authorId);
      return new Response(JSON.stringify({ message: "無效的用戶ID" }), {
        status: 400,
      });
    }

    // Create post
    const post = await prisma.post.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        board,
        authorId: parseInt(authorId), // 確保 authorId 是整數
        view: 0,
        likeCount: 0,
      },
      include: {
        author: {
          select: {
            username: true,
          },
        },
      },
    });

    console.log("Post created:", post);

    // Serialize the response
    const serializedPost = {
      ...post,
      view: Number(post.view),
      likeCount: Number(post.likeCount),
      createdAt: post.createdAt.toISOString(),
    };

    return new Response(JSON.stringify({ post: serializedPost }), { 
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error("創建話題失敗:", error);
    return new Response(JSON.stringify({ 
      message: "伺服器錯誤",
      error: error.message 
    }), {
      status: 500,
    });
  }
}
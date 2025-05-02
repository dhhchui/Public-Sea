import prisma from "../../../lib/prisma";
import { getServerSession } from "next-auth";

export async function POST(request) {
  const session = await getServerSession();
  if (!session || !session.user) {
    return new Response(JSON.stringify({ message: "請先登入" }), {
      status: 401,
    });
  }

  const { content, postId } = await request.json();
  if (!content || !postId) {
    return new Response(
      JSON.stringify({ message: "留言內容和話題 ID 為必填" }),
      { status: 400 }
    );
  }

  try {
    const chat = await prisma.chat.create({
      data: {
        content,
        postId: parseInt(postId),
        authorId: session.user.id,
        createdAt: new Date(),
      },
    });
    return new Response(JSON.stringify({ message: "留言提交成功", chat }), {
      status: 201,
    });
  } catch (error) {
    return new Response(JSON.stringify({ message: "伺服器錯誤" }), {
      status: 500,
    });
  }
}

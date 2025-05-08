import prisma from "@/lib/prisma.js";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const board = searchParams.get("board");
    const page = parseInt(searchParams.get("page")) || 1;
    const pageSize = parseInt(searchParams.get("pageSize")) || 10;
    const popular = searchParams.get("popular");
    const postId = searchParams.get("postId");

    console.log("Received GET /api/post-list:", {
      board,
      page,
      pageSize,
      popular,
      postId,
    });

    if (postId) {
      const post = await prisma.post.findUnique({
        where: { id: parseInt(postId) },
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
            include: { author: { select: { id: true, username: true } } },
            skip: (page - 1) * pageSize,
            take: pageSize,
          },
        },
      });

      if (!post) {
        console.log(`Post not found: postId=${postId}`);
        return NextResponse.json({ message: "找不到貼文" }, { status: 404 });
      }

      const totalComments = await prisma.comment.count({
        where: { postId: parseInt(postId) },
      });

      const serializedPost = {
        ...post,
        view: post.view.toString(),
      };

      return NextResponse.json(
        { post: serializedPost, totalComments, page, pageSize },
        { status: 200 }
      );
    }

    if (board && typeof board !== "string") {
      console.log("Invalid board parameter:", board);
      return NextResponse.json({ message: "無效的討論區參數" }, { status: 400 });
    }

    let where = {};
    let orderBy = { createdAt: "desc" };

    if (board) {
      where = {
        board: {
          is: {
            name: board,
          },
        },
      };
    }

    if (popular === "true") {
      orderBy = { view: "desc" };
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
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
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.post.count({ where }),
    ]);

    const serializedPosts = posts.map((post) => ({
      ...post,
      view: post.view.toString(),
    }));

    console.log(`Returning ${posts.length} posts, total: ${total}`);

    return NextResponse.json(
      {
        posts: serializedPosts,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in GET /api/post-list:", {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { message: "伺服器錯誤: " + error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
import prisma from "../../../lib/prisma";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export async function POST(request) {
  console.log("Received POST request to /api/create-post");

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No token provided in Authorization header");
      return NextResponse.json({ message: "No token provided" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    console.log("Token received:", token);

    if (!token) {
      console.log("Token is empty or undefined");
      return NextResponse.json({ message: "Token is empty" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Token decoded:", decoded);

    const { title, content, board } = await request.json();
    if (!title || !content || !board) {
      console.log("Missing required fields:", { title, content, board });
      return NextResponse.json({ message: "Title, content, and board are required" }, { status: 400 });
    }

    let boardRecord = await prisma.board.findUnique({ where: { name: board } });
    if (!boardRecord) {
      console.log(`Board not found, creating new board: ${board}`);
      boardRecord = await prisma.board.create({
        data: { name: board },
      });
    }

    const post = await prisma.post.create({
      data: {
        title,
        content,
        authorId: decoded.userId,
        boardId: boardRecord.id,
        view: 0,
        likeCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        author: { select: { username: true } },
        board: { select: { name: true } },
      },
    });

    console.log("Post created:", post);

    // 將 BigInt 轉換為字符串以避免序列化錯誤
    const serializedPost = {
      ...post,
      view: post.view.toString(), // 將 BigInt 轉為字符串
    };

    return NextResponse.json({ message: "Post created successfully", post: serializedPost }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/create-post:", error);
    if (error.name === "JsonWebTokenError") {
      console.log("JWT Error details:", error.message);
      return NextResponse.json({ message: "Invalid or malformed token" }, { status: 401 });
    }
    return NextResponse.json({ message: "Server error: " + error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
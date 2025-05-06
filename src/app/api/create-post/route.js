import prisma from "../../../lib/prisma";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export async function POST(request) {
  console.log("Received POST request to /api/create-post");

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No token provided");
      return NextResponse.json({ message: "No token provided" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    console.log("Verifying JWT...");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let data;
    try {
      data = await request.json();
      console.log("Request body:", data);
    } catch (error) {
      console.error("Error parsing request body:", error);
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }

    const { title, content, board } = data;

    if (!title || !content || !board) {
      console.log("Missing required fields");
      return NextResponse.json({ message: "Title, content, and board are required" }, { status: 400 });
    }

    const boardRecord = await prisma.board.findUnique({ where: { name: board } });
    if (!boardRecord) {
      console.log(`Board not found: ${board}`);
      return NextResponse.json({ message: "Board not found" }, { status: 404 });
    }

    const post = await prisma.post.create({
      data: {
        title,
        content,
        boardId: boardRecord.id,
        authorId: decoded.userId,
        view: BigInt(0),
        likeCount: 0,
      },
    });

    const serializedPost = {
      ...post,
      view: post.view.toString(),
    };

    return NextResponse.json({ message: "Post created successfully", post: serializedPost }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/create-post:", {
      message: error.message,
      stack: error.stack,
    });
    if (error.name === "JsonWebTokenError") {
      return NextResponse.json({ message: "Invalid or expired token" }, { status: 401 });
    }
    return NextResponse.json({ message: "Server error: " + error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
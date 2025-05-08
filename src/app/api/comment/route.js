import prisma from "../../../lib/prisma";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export async function POST(request) {
  console.log("Received POST request to /api/comment");

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No token provided in Authorization header");
      return NextResponse.json({ message: "No token provided" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    console.log("Token received:", token);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded JWT:", decoded);

    const { postId, content } = await request.json();
    if (!postId || !content) {
      console.log("Missing required fields:", { postId, content });
      return NextResponse.json({ message: "Post ID and content are required" }, { status: 400 });
    }

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      console.log("Post not found:", postId);
      return NextResponse.json({ message: "Post not found" }, { status: 404 });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        authorId: decoded.userId,
        postId,
        likeCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        author: {
          select: { username: true },
        },
      },
    });

    console.log("Comment created:", comment);
    return NextResponse.json({ message: "Comment created successfully", comment }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/comment:", error);
    if (error.name === "JsonWebTokenError") {
      return NextResponse.json({ message: "Invalid or expired token" }, { status: 401 });
    }
    return NextResponse.json({ message: "Server error: " + error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
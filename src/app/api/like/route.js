import prisma from "../../../lib/prisma";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export async function POST(request) {
  console.log("Received POST request to /api/like");
  console.log("JWT_SECRET in /api/like:", process.env.JWT_SECRET);

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

    const { itemId, itemType, action } = await request.json();
    if (!itemId || !itemType || !action) {
      console.log("Missing required fields:", { itemId, itemType, action });
      return NextResponse.json({ message: "Item ID, item type, and action are required" }, { status: 400 });
    }

    if (!["post", "comment"].includes(itemType)) {
      console.log("Invalid item type:", itemType);
      return NextResponse.json({ message: "Invalid item type" }, { status: 400 });
    }

    if (!["like", "unlike"].includes(action)) {
      console.log("Invalid action:", action);
      return NextResponse.json({ message: "Invalid action" }, { status: 400 });
    }

    const model = itemType === "post" ? prisma.post : prisma.comment;
    const item = await model.findUnique({ where: { id: itemId } });
    if (!item) {
      console.log(`${itemType} not found:`, itemId);
      return NextResponse.json({ message: `${itemType} not found` }, { status: 404 });
    }

    const likeIdentifier = {
      userId_itemId_itemType: {
        userId: decoded.userId,
        itemId,
        itemType,
      },
    };

    if (action === "like") {
      const existingLike = await prisma.like.findUnique({ where: likeIdentifier });
      if (existingLike) {
        console.log("Like already exists:", likeIdentifier);
        return NextResponse.json({ message: "Already liked" }, { status: 400 });
      }

      await prisma.$transaction([
        prisma.like.create({
          data: {
            userId: decoded.userId,
            itemId,
            itemType,
            createdAt: new Date(),
          },
        }),
        model.update({
          where: { id: itemId },
          data: { likeCount: { increment: 1 } },
        }),
      ]);

      console.log("Like created:", likeIdentifier);
      return NextResponse.json({ message: "Liked successfully" }, { status: 200 });
    } else {
      const existingLike = await prisma.like.findUnique({ where: likeIdentifier });
      if (!existingLike) {
        console.log("Like does not exist:", likeIdentifier);
        return NextResponse.json({ message: "Not liked yet" }, { status: 400 });
      }

      await prisma.$transaction([
        prisma.like.delete({ where: likeIdentifier }),
        model.update({
          where: { id: itemId },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);

      console.log("Like removed:", likeIdentifier);
      return NextResponse.json({ message: "Unliked successfully" }, { status: 200 });
    }
  } catch (error) {
    console.error("Error in POST /api/like:", error);
    if (error.name === "JsonWebTokenError") {
      return NextResponse.json({ message: "Invalid or expired token" }, { status: 401 });
    }
    return NextResponse.json({ message: "Server error: " + error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
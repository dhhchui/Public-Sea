import prisma from "../../../../lib/prisma";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export async function POST(request) {
  console.log("Received POST request to /api/like-status/batch");
  console.log("JWT_SECRET in /api/like-status/batch:", process.env.JWT_SECRET);

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

    const { items } = await request.json();
    if (!Array.isArray(items) || items.length === 0) {
      console.log("Invalid or empty items array");
      return NextResponse.json({ message: "Items array is required" }, { status: 400 });
    }

    const statuses = await Promise.all(
      items.map(async ({ itemId, itemType }) => {
        const like = await prisma.like.findUnique({
          where: {
            userId_itemId_itemType: {
              userId: decoded.userId,
              itemId,
              itemType,
            },
          },
        });
        return {
          itemId,
          itemType,
          liked: !!like,
        };
      })
    );

    console.log("Like statuses:", statuses);
    return NextResponse.json({ statuses }, { status: 200 });
  } catch (error) {
    console.error("Error in POST /api/like-status/batch:", error);
    if (error.name === "JsonWebTokenError") {
      return NextResponse.json({ message: "Invalid or expired token" }, { status: 401 });
    }
    return NextResponse.json({ message: "Server error: " + error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
  console.log("Received GET request to /api/boards");

  try {
    const boards = await prisma.board.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    if (!boards || boards.length === 0) {
      console.log("No boards found in the database");
      return NextResponse.json({ message: "No boards found" }, { status: 404 });
    }

    console.log("Boards retrieved:", boards);
    return NextResponse.json({ boards }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/boards:", {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { message: "Server error: " + error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
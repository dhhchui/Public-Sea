import prisma from "../../../../lib/prisma";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export async function POST(request) {
  console.log("Received POST request to /api/notifications/read");
  const startTime = performance.now();

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No token provided");
      return NextResponse.json(
        { message: "No token provided" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    console.log("Verifying JWT...");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const { notificationId } = await request.json();
    if (!notificationId) {
      console.log("Missing notificationId");
      return NextResponse.json(
        { message: "Missing notificationId" },
        { status: 400 }
      );
    }

    const notificationIdInt = parseInt(notificationId);
    if (isNaN(notificationIdInt)) {
      console.log("Invalid notificationId");
      return NextResponse.json(
        { message: "Invalid notificationId" },
        { status: 400 }
      );
    }

    const notification = await prisma.notification.findUnique({
      where: { id: notificationIdInt },
    });

    if (!notification || notification.userId !== userId) {
      console.log("Notification not found or not authorized");
      return NextResponse.json(
        { message: "Notification not found or not authorized" },
        { status: 404 }
      );
    }

    await prisma.notification.update({
      where: { id: notificationIdInt },
      data: { isRead: true },
    });

    const endTime = performance.now();
    console.log(`Total response time: ${(endTime - startTime).toFixed(2)}ms`);
    return NextResponse.json(
      { message: "Notification marked as read" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in POST /api/notifications/read:", error);
    return NextResponse.json(
      { message: "Server error: " + error.message },
      { status: 500 }
    );
  }
}

import prisma from "../../../../lib/prisma";
import { NextResponse } from "next/server";
import { authMiddleware } from "@/lib/authMiddleware";

export const POST = authMiddleware({ required: true })(
  async (request, { userId }) => {
    console.log("Received POST request to /api/notifications/delete");
    const startTime = performance.now();

    try {
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

      await prisma.notification.delete({
        where: { id: notificationIdInt },
      });

      const endTime = performance.now();
      console.log(`Total response time: ${(endTime - startTime).toFixed(2)}ms`);
      return NextResponse.json(
        { message: "Notification deleted" },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error in POST /api/notifications/delete:", error);
      return NextResponse.json(
        { message: "Server error: " + error.message },
        { status: 500 }
      );
    }
  }
);

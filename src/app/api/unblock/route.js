import prisma from "../../../lib/prisma";
import { NextResponse } from "next/server";
import { authMiddleware } from "@/lib/authMiddleware";
import { invalidateBlockedUserCache } from "@/lib/cache";

export const POST = authMiddleware({ required: true })(
  async (request, { userId }) => {
    console.log("Received POST request to /api/unblock");

    try {
      const { blockedUserId } = await request.json();
      if (!blockedUserId) {
        console.log("No blockedUserId provided");
        return NextResponse.json(
          { message: "Blocked user ID is required" },
          { status: 400 }
        );
      }

      const blockRecord = await prisma.block.findFirst({
        where: {
          blockerId: userId,
          blockedId: blockedUserId,
        },
      });

      if (!blockRecord) {
        console.log("Block record not found");
        return NextResponse.json(
          { message: "Block record not found" },
          { status: 404 }
        );
      }

      await prisma.block.delete({
        where: {
          id: blockRecord.id,
        },
      });

      // 失效封鎖相關快取
      await invalidateBlockedUserCache(userId);

      console.log(
        `User ${blockedUserId} unblocked successfully by user ${userId}`
      );
      return NextResponse.json(
        { message: "User unblocked successfully" },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error in POST /api/unblock:", error);
      return NextResponse.json(
        { message: "Server error: " + error.message },
        { status: 500 }
      );
    }
  }
);

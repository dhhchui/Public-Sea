import prisma from "../../../../lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(request) {
  console.log("Received POST request to /api/friend-request/send");

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No token provided");
      return new Response(JSON.stringify({ message: "No token provided" }), {
        status: 401,
      });
    }

    const token = authHeader.split(" ")[1];
    console.log("Verifying JWT...");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const senderId = decoded.userId;

    let data;
    try {
      data = await request.json();
      console.log("Request body:", data);
    } catch (error) {
      console.error("Error parsing request body:", error);
      return new Response(JSON.stringify({ message: "Invalid request body" }), {
        status: 400,
      });
    }

    const { receiverId } = data;
    if (!receiverId) {
      console.log("Missing receiverId");
      return new Response(
        JSON.stringify({ message: "Receiver ID is required" }),
        { status: 400 }
      );
    }

    const receiverIdInt = parseInt(receiverId);
    if (isNaN(receiverIdInt) || receiverIdInt === senderId) {
      console.log("Invalid receiverId or attempting to send request to self");
      return new Response(
        JSON.stringify({
          message: "Invalid receiver ID or cannot send request to self",
        }),
        { status: 400 }
      );
    }

    const receiver = await prisma.user.findUnique({
      where: { id: receiverIdInt },
    });
    if (!receiver) {
      console.log("Receiver not found");
      return new Response(JSON.stringify({ message: "Receiver not found" }), {
        status: 404,
      });
    }

    // 檢查接收者是否封鎖了發送者
    const blockRecord = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: receiverIdInt,
          blockedId: senderId,
        },
      },
    });
    if (blockRecord) {
      console.log("You are blocked by the receiver");
      return new Response(
        JSON.stringify({ message: "You are blocked by the receiver" }),
        { status: 403 }
      );
    }

    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { friends: true },
    });
    if (sender.friends.includes(receiverIdInt)) {
      console.log("Already friends");
      return new Response(JSON.stringify({ message: "Already friends" }), {
        status: 400,
      });
    }

    const existingRequest = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId: receiverIdInt, status: "pending" },
          { senderId: receiverIdInt, receiverId: senderId, status: "pending" },
        ],
      },
    });
    if (existingRequest) {
      console.log("Friend request already exists");
      return new Response(
        JSON.stringify({ message: "Friend request already exists" }),
        { status: 400 }
      );
    }

    const friendRequest = await prisma.friendRequest.create({
      data: {
        senderId,
        receiverId: receiverIdInt,
        status: "pending",
      },
    });

    return new Response(
      JSON.stringify({
        message: "Friend request sent successfully",
        requestId: friendRequest.id,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/friend-request/send:", error);
    return new Response(
      JSON.stringify({ message: "Server error: " + error.message }),
      { status: 500 }
    );
  }
}

import prisma from "../../../../lib/prisma";
import jwt from "jsonwebtoken"; // 添加這行以導入 jsonwebtoken

export async function POST(request) {
  console.log("Received POST request to /api/friend-request/respond");

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
    const userId = decoded.userId;

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

    const { requestId, action } = data;

    if (!requestId || !["accept", "reject"].includes(action)) {
      console.log("Missing requestId or invalid action");
      return new Response(
        JSON.stringify({
          message: "Request ID and valid action (accept/reject) are required",
        }),
        { status: 400 }
      );
    }

    const requestIdInt = parseInt(requestId);
    if (isNaN(requestIdInt)) {
      console.log("Invalid requestId");
      return new Response(JSON.stringify({ message: "Invalid requestId" }), {
        status: 400,
      });
    }

    const friendRequest = await prisma.friendRequest.findUnique({
      where: { id: requestIdInt },
      include: {
        sender: true,
        receiver: true,
      },
    });

    if (!friendRequest) {
      console.log("Friend request not found");
      return new Response(
        JSON.stringify({ message: "Friend request not found" }),
        { status: 404 }
      );
    }

    if (friendRequest.receiverId !== userId) {
      console.log(
        "Unauthorized: You are not the receiver of this friend request"
      );
      return new Response(
        JSON.stringify({
          message:
            "Unauthorized: You are not the receiver of this friend request",
        }),
        { status: 403 }
      );
    }

    if (friendRequest.status !== "pending") {
      console.log("Friend request is not pending");
      return new Response(
        JSON.stringify({ message: "Friend request is not pending" }),
        { status: 400 }
      );
    }

    if (action === "reject") {
      await prisma.friendRequest.update({
        where: { id: requestIdInt },
        data: { status: "rejected" },
      });

      return new Response(
        JSON.stringify({ message: "Friend request rejected successfully" }),
        { status: 200 }
      );
    }

    const senderId = friendRequest.senderId;
    const receiverId = friendRequest.receiverId;

    await prisma.friendRequest.update({
      where: { id: requestIdInt },
      data: { status: "accepted" },
    });

    await prisma.user.update({
      where: { id: senderId },
      data: {
        friends: {
          push: receiverId,
        },
      },
    });

    await prisma.user.update({
      where: { id: receiverId },
      data: {
        friends: {
          push: senderId,
        },
      },
    });

    return new Response(
      JSON.stringify({ message: "Friend request accepted successfully" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in POST /api/friend-request/respond:", error);
    return new Response(
      JSON.stringify({ message: "Server error: " + error.message }),
      { status: 500 }
    );
  }
}
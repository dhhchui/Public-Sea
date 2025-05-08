import prisma from "../../../../lib/prisma";
import jwt from "jsonwebtoken";

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
    if (!requestId || !action) {
      console.log("Missing requestId or action");
      return new Response(
        JSON.stringify({ message: "Request ID and action are required" }),
        { status: 400 }
      );
    }

    if (!["accept", "reject"].includes(action)) {
      console.log("Invalid action");
      return new Response(
        JSON.stringify({
          message: 'Invalid action, must be "accept" or "reject"',
        }),
        { status: 400 }
      );
    }

    const requestIdInt = parseInt(requestId);
    if (isNaN(requestIdInt)) {
      console.log("Invalid requestId");
      return new Response(JSON.stringify({ message: "Invalid request ID" }), {
        status: 400,
      });
    }

    // 檢查請求是否存在
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

    // 檢查用戶是否有權處理該請求
    if (friendRequest.receiverId !== userId) {
      console.log("Unauthorized to respond to this request");
      return new Response(
        JSON.stringify({ message: "Unauthorized to respond to this request" }),
        { status: 403 }
      );
    }

    // 檢查請求是否已處理
    if (friendRequest.status !== "pending") {
      console.log("Friend request already processed");
      return new Response(
        JSON.stringify({ message: "Friend request already processed" }),
        { status: 400 }
      );
    }

    // 更新請求狀態
    await prisma.friendRequest.update({
      where: { id: requestIdInt },
      data: { status: action === "accept" ? "accepted" : "rejected" },
    });

    if (action === "accept") {
      // 將雙方加入彼此的朋友列表
      await prisma.user.update({
        where: { id: friendRequest.senderId },
        data: {
          friends: {
            push: friendRequest.receiverId,
          },
        },
      });

      await prisma.user.update({
        where: { id: friendRequest.receiverId },
        data: {
          friends: {
            push: friendRequest.senderId,
          },
        },
      });

      return new Response(
        JSON.stringify({ message: "Friend request accepted, friends added" }),
        { status: 200 }
      );
    } else {
      return new Response(
        JSON.stringify({ message: "Friend request rejected" }),
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Error in POST /api/friend-request/respond:", error);
    return new Response(
      JSON.stringify({ message: "Server error: " + error.message }),
      { status: 500 }
    );
  }
}

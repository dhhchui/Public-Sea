import prisma from "../../../../lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(request) {
  console.log("Received POST request to /api/friend-request/send");
  const startTime = performance.now();

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

    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { isRedFlagged: true, nickname: true },
    });

    if (!sender) {
      console.log("Sender not found");
      return new Response(JSON.stringify({ message: "Sender not found" }), {
        status: 404,
      });
    }

    if (sender.isRedFlagged) {
      console.log("Sender is redflagged and cannot send friend requests");
      return new Response(
        JSON.stringify({
          message: "由於你的帳戶被標記為紅旗，無法發送好友請求",
        }),
        { status: 403 }
      );
    }

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

    if (!receiverId || receiverId === senderId) {
      console.log("Invalid receiverId or attempting to send request to self");
      return new Response(
        JSON.stringify({ message: "無效的接收者 ID 或無法向自己發送請求" }),
        { status: 400 }
      );
    }

    const receiverIdInt = parseInt(receiverId);
    if (isNaN(receiverIdInt)) {
      console.log("Invalid receiverId");
      return new Response(JSON.stringify({ message: "無效的接收者 ID" }), {
        status: 400,
      });
    }

    const receiver = await prisma.user.findUnique({
      where: { id: receiverIdInt },
    });
    if (!receiver) {
      console.log("Receiver not found");
      return new Response(JSON.stringify({ message: "接收者不存在" }), {
        status: 404,
      });
    }

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
      return new Response(JSON.stringify({ message: "你已被接收者封鎖" }), {
        status: 403,
      });
    }

    // 檢查是否已是好友
    const senderUser = await prisma.user.findUnique({
      where: { id: senderId },
      select: { friends: true },
    });
    if (senderUser.friends.includes(receiverIdInt)) {
      console.log("You are already friends");
      return new Response(JSON.stringify({ message: "你們已是好友" }), {
        status: 400,
      });
    }

    // 檢查是否已存在任何狀態的請求（不僅限於 pending）
    const existingRequest = await prisma.friendRequest.findFirst({
      where: {
        senderId,
        receiverId: receiverIdInt,
      },
    });

    if (existingRequest) {
      console.log(
        "Friend request already exists with status:",
        existingRequest.status
      );
      return new Response(
        JSON.stringify({
          message:
            existingRequest.status === "pending"
              ? "已發送過待處理的好友請求"
              : existingRequest.status === "accepted"
              ? "你們已是好友"
              : "之前已發送過請求，請等待對方處理",
        }),
        { status: 400 }
      );
    }

    const friendRequest = await prisma.friendRequest.create({
      data: {
        senderId,
        receiverId: receiverIdInt,
        status: "pending",
      },
      include: {
        sender: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
    });

    await prisma.notification.create({
      data: {
        userId: receiverIdInt,
        type: "FRIEND_REQUEST",
        content: `${sender.nickname || "一位用戶"} 發送了好友請求`,
        senderId,
        isRead: false,
        createdAt: new Date(),
      },
    });
    console.log(
      `Generated FRIEND_REQUEST notification for user ${receiverIdInt}`
    );

    const endTime = performance.now();
    console.log(`Total response time: ${(endTime - startTime).toFixed(2)}ms`);
    return new Response(
      JSON.stringify({ message: "好友請求已發送", friendRequest }),
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/friend-request/send:", error);
    return new Response(
      JSON.stringify({ message: "伺服器錯誤: " + error.message }),
      { status: 500 }
    );
  }
}

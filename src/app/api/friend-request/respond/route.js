import prisma from '../../../../lib/prisma';
import jwt from 'jsonwebtoken';
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

export async function POST(request) {
  console.log('Received POST request to /api/friend-request/respond');
  const startTime = performance.now();

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No token provided');
      return new Response(JSON.stringify({ message: 'No token provided' }), {
        status: 401,
      });
    }

    const token = authHeader.split(' ')[1];
    console.log('Verifying JWT...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    let data;
    try {
      data = await request.json();
      console.log('Request body:', data);
    } catch (error) {
      console.error('Error parsing request body:', error);
      return new Response(JSON.stringify({ message: 'Invalid request body' }), {
        status: 400,
      });
    }

    const { requestId, action } = data;

    if (!requestId || !['accept', 'reject'].includes(action)) {
      console.log('Missing requestId or invalid action');
      return new Response(
        JSON.stringify({
          message: 'Request ID and valid action (accept/reject) are required',
        }),
        { status: 400 }
      );
    }

    const requestIdInt = parseInt(requestId);
    if (isNaN(requestIdInt)) {
      console.log('Invalid requestId');
      return new Response(JSON.stringify({ message: 'Invalid requestId' }), {
        status: 400,
      });
    }

    const friendRequest = await prisma.friendRequest.findUnique({
      where: { id: requestIdInt },
      include: {
        sender: { select: { id: true, nickname: true } },
        receiver: { select: { id: true, nickname: true } },
      },
    });

    if (!friendRequest) {
      console.log('Friend request not found');
      return new Response(
        JSON.stringify({ message: 'Friend request not found' }),
        { status: 404 }
      );
    }

    if (friendRequest.receiverId !== userId) {
      console.log(
        'Unauthorized: You are not the receiver of this friend request'
      );
      return new Response(
        JSON.stringify({
          message:
            'Unauthorized: You are not the receiver of this friend request',
        }),
        { status: 403 }
      );
    }

    if (friendRequest.status !== 'pending') {
      console.log('Friend request is not pending');
      return new Response(
        JSON.stringify({ message: 'Friend request is not pending' }),
        { status: 400 }
      );
    }

    if (action === 'reject') {
      await prisma.friendRequest.update({
        where: { id: requestIdInt },
        data: { status: 'rejected' },
      });

      // 為發送者生成拒絕通知
      await prisma.notification.create({
        data: {
          userId: friendRequest.senderId,
          type: 'friend_reject',
          content: `${friendRequest.receiver.nickname} 拒絕了你的好友請求`,
          senderId: friendRequest.receiverId,
          isRead: false,
          createdAt: new Date(),
        },
      });
      console.log(
        `Generated friend_reject notification for user ${friendRequest.senderId}`
      );

      await pusher.trigger(`user-${friendRequest.senderId}`, 'notification', {
        type: 'friend_reject',
        senderId: friendRequest.receiverId,
        message: `${friendRequest.receiver.nickname} 拒絕了你的好友請求`,
      });

      const endTime = performance.now();
      console.log(`Total response time: ${(endTime - startTime).toFixed(2)}ms`);
      return new Response(
        JSON.stringify({ message: 'Friend request rejected successfully' }),
        { status: 200 }
      );
    }

    const senderId = friendRequest.senderId;
    const receiverId = friendRequest.receiverId;

    await prisma.friendRequest.update({
      where: { id: requestIdInt },
      data: { status: 'accepted' },
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

    // 自動互助追蹤：更新雙方的 followerIds 和 followedIds
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { followerIds: true, followedIds: true },
    });

    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { followerIds: true, followedIds: true },
    });

    // 更新發送者的 followerIds 和 followedIds
    await prisma.user.update({
      where: { id: senderId },
      data: {
        followerIds: {
          set: [...(sender.followerIds || []), receiverId],
        },
        followedIds: {
          set: [...(sender.followedIds || []), receiverId],
        },
        followedCount: { increment: 1 },
      },
    });

    // 更新接收者的 followerIds 和 followedIds
    await prisma.user.update({
      where: { id: receiverId },
      data: {
        followerIds: {
          set: [...(receiver.followerIds || []), senderId],
        },
        followedIds: {
          set: [...(receiver.followedIds || []), senderId],
        },
        followedCount: { increment: 1 },
      },
    });

    // 為發送者生成接受通知
    await prisma.notification.create({
      data: {
        userId: senderId,
        type: 'friend_accept',
        content: `${friendRequest.receiver.nickname} 接受了你的好友請求`,
        senderId: receiverId,
        isRead: false,
        createdAt: new Date(),
      },
    });
    console.log(`Generated friend_accept notification for user ${senderId}`);

    await pusher.trigger(`user-${senderId}`, 'notification', {
      type: 'friend_accept',
      senderId: receiverId,
      message: `${friendRequest.receiver.nickname} 接受了你的好友請求`,
    });

    const endTime = performance.now();
    console.log(`Total response time: ${(endTime - startTime).toFixed(2)}ms`);
    return new Response(
      JSON.stringify({ message: 'Friend request accepted successfully' }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in POST /api/friend-request/respond:', error);
    return new Response(
      JSON.stringify({ message: 'Server error: ' + error.message }),
      { status: 500 }
    );
  }
}

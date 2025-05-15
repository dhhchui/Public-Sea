export async function POST(request) {
  console.log('Received POST request to /api/follow');

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
    if (!decoded.userId) {
      console.log('Invalid token payload');
      return new Response(JSON.stringify({ message: 'Invalid token' }), {
        status: 401,
      });
    }

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

    const { targetUserId } = data;

    if (!targetUserId) {
      console.log('Missing required field: targetUserId');
      return new Response(
        JSON.stringify({ message: 'Target user ID is required' }),
        { status: 400 }
      );
    }

    const targetUserIdInt = parseInt(targetUserId);
    if (isNaN(targetUserIdInt)) {
      console.log('Invalid targetUserId, must be a number');
      return new Response(
        JSON.stringify({ message: 'Target user ID must be a number' }),
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserIdInt },
    });

    if (!targetUser) {
      console.log('Target user not found');
      return new Response(
        JSON.stringify({ message: 'Target user not found' }),
        { status: 404 }
      );
    }

    if (targetUserIdInt === decoded.userId) {
      console.log('Cannot follow yourself');
      return new Response(
        JSON.stringify({ message: 'You cannot follow yourself' }),
        { status: 400 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    // 確保 followedIds 是一個數組，並移除重複 ID
    let currentUserFollowedIds = Array.isArray(currentUser.followedIds)
      ? currentUser.followedIds
      : [];
    currentUserFollowedIds = [...new Set(currentUserFollowedIds)]; // 移除重複 ID
    if (currentUserFollowedIds.includes(targetUserIdInt)) {
      console.log('Already following this user');
      return new Response(
        JSON.stringify({ message: 'You are already following this user' }),
        { status: 400 }
      );
    }

    // 確保 followerIds 是一個數組，並移除重複 ID
    let targetUserFollowerIds = Array.isArray(targetUser.followerIds)
      ? targetUser.followerIds
      : [];
    targetUserFollowerIds = [...new Set(targetUserFollowerIds)]; // 移除重複 ID

    // 確保計數欄位與實際 ID 數量一致
    const currentUserFollowedCount = currentUserFollowedIds.length;
    const targetUserFollowerCount = targetUserFollowerIds.length;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: decoded.userId },
        data: {
          followedIds: {
            set: [...currentUserFollowedIds, targetUserIdInt],
          },
          followedCount: {
            set: currentUserFollowedCount + 1,
          },
        },
      }),
      prisma.user.update({
        where: { id: targetUserIdInt },
        data: {
          followerIds: {
            set: [...targetUserFollowerIds, decoded.userId],
          },
          followerCount: {
            set: targetUserFollowerCount + 1,
          },
        },
      }),
    ]);

    console.log('User followed successfully');
    return new Response(
      JSON.stringify({ message: 'User followed successfully' }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in POST /api/follow:', error);
    if (error.name === 'JsonWebTokenError') {
      console.log('Invalid token');
      return new Response(JSON.stringify({ message: 'Invalid token' }), {
        status: 401,
      });
    }
    return new Response(
      JSON.stringify({ message: 'Server error: ' + error.message }),
      { status: 500 }
    );
  }
}

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function clearDuplicateFriendRequests() {
  try {
    const requests = await prisma.friendRequest.findMany();
    const seen = new Set();
    const duplicates = [];

    // 找出重複的記錄
    for (const request of requests) {
      const key = `${request.senderId}-${request.receiverId}`;
      if (seen.has(key)) {
        duplicates.push(request.id);
      } else {
        seen.add(key);
      }
    }

    // 刪除重複的記錄（保留第一條）
    if (duplicates.length > 0) {
      await prisma.friendRequest.deleteMany({
        where: { id: { in: duplicates } },
      });
      console.log(`Deleted ${duplicates.length} duplicate friend requests.`);
    } else {
      console.log("No duplicate friend requests found.");
    }
  } catch (error) {
    console.error("Error clearing duplicate friend requests:", error);
  } finally {
    await prisma.$disconnect();
  }
}

clearDuplicateFriendRequests();

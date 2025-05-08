const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

    async function checkBoards() {
      try {
        const boards = await prisma.board.findMany({
          select: { id: true, name: true },
        });
        console.log("Boards in database:", boards);
      } catch (error) {
        console.error("Error querying boards:", error);
      } finally {
        await prisma.$disconnect();
      }
    }

    checkBoards();
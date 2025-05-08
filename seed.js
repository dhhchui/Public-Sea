const { PrismaClient } = require('@prisma/client');
   const prisma = new PrismaClient();

   async function main() {
     await prisma.board.upsert({
       where: { name: 'current-affairs' },
       update: {},
       create: {
         name: 'current-affairs',
         createdAt: new Date(),
         updatedAt: new Date(),
       },
     });
     console.log('成功插入 Board: current-affairs');
   }

   main()
     .catch((e) => {
       console.error(e);
       process.exit(1);
     })
     .finally(async () => {
       await prisma.$disconnect();
     });
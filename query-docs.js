const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const docs = await prisma.document.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { folder: true, uploader: true, department: true }
  });
  console.log(JSON.stringify(docs, null, 2));
}

main().finally(() => prisma.$disconnect());

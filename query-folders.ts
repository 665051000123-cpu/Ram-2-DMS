import 'dotenv/config';
import { prisma } from './src/lib/prisma';

async function main() {
  const folders = await prisma.folder.findMany({
    where: { name: 'สัญญาซื้อขาย' },
    include: { department: true }
  });
  console.log(JSON.stringify(folders, null, 2));
}

main().finally(() => prisma.$disconnect());

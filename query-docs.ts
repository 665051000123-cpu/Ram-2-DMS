import 'dotenv/config';
import { prisma } from './src/lib/prisma';

async function main() {
  await prisma.user.update({
    where: { id: 'abdc1806-ed36-4e39-a70d-e70abfafae91' },
    data: { departmentId: '35e220b4-c2fc-45bc-87ca-e8ce76566dc0' }
  });
  
  await prisma.document.updateMany({
    where: { uploaderId: 'abdc1806-ed36-4e39-a70d-e70abfafae91' },
    data: { 
      departmentId: '35e220b4-c2fc-45bc-87ca-e8ce76566dc0',
      folderId: '78b82229-1470-4ca2-ac3f-3748a35372aa'
    }
  });
  console.log("Fixed user and documents");
}

main().finally(() => prisma.$disconnect());

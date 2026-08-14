const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const allFolders = await prisma.folder.findMany({ include: { subFolders: true, documents: true } });
  let deletedCount = 0;
  for (const folder of allFolders) {
    if ((!folder.departmentId || folder.parentId) && folder.documents.length === 0 && folder.subFolders.length === 0) {
      console.log('Deleting:', folder.name);
      await prisma.folder.delete({ where: { id: folder.id } });
      deletedCount++;
    }
  }
  const remainingFolders = await prisma.folder.findMany({ include: { subFolders: true, documents: true } });
  for (const folder of remainingFolders) {
    if ((!folder.departmentId || folder.parentId) && folder.documents.length === 0 && folder.subFolders.length === 0) {
      console.log('Deleting pass 2:', folder.name);
      await prisma.folder.delete({ where: { id: folder.id } });
      deletedCount++;
    }
  }
  
  // Also pass 3
  const remainingFolders3 = await prisma.folder.findMany({ include: { subFolders: true, documents: true } });
  for (const folder of remainingFolders3) {
    if ((!folder.departmentId || folder.parentId) && folder.documents.length === 0 && folder.subFolders.length === 0) {
      console.log('Deleting pass 3:', folder.name);
      await prisma.folder.delete({ where: { id: folder.id } });
      deletedCount++;
    }
  }
  
  console.log('Deleted total:', deletedCount);
}
main().catch(console.error).finally(() => prisma.$disconnect());

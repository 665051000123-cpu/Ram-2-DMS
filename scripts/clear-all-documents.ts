import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log("Starting cleanup process...");

  // 1. Delete dependent tables first
  console.log("Deleting document comments...");
  await prisma.comment.deleteMany();

  console.log("Deleting document links...");
  await prisma.documentLink.deleteMany();

  console.log("Deleting document versions...");
  await prisma.documentVersion.deleteMany();

  console.log("Deleting audit logs...");
  await prisma.auditLog.deleteMany();

  console.log("Deleting document access lists...");
  await prisma.documentAccess.deleteMany();

  console.log("Deleting notifications...");
  await prisma.notification.deleteMany();
  
  console.log("Deleting favorites...");
  await prisma.favorite.deleteMany();

  console.log("Deleting all documents...");
  await prisma.document.deleteMany();

  // 2. Clear physical files in public/uploads
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  if (fs.existsSync(uploadDir)) {
    console.log("Clearing physical files in:", uploadDir);
    const dirs = fs.readdirSync(uploadDir);
    for (const dir of dirs) {
      const fullPath = path.join(uploadDir, dir);
      if (fs.statSync(fullPath).isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(fullPath);
      }
    }
  }

  console.log("Cleanup completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during cleanup:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

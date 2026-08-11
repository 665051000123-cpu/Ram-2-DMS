import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log("Starting Folder Migration...");

  // 1. Get all departments
  const departments = await prisma.department.findMany();
  
  for (const dept of departments) {
    console.log(`Processing department: ${dept.name}`);
    
    // 2. Create or find folder for this department
    let folder = await prisma.folder.findFirst({
      where: { name: dept.name, departmentId: dept.id }
    });

    if (!folder) {
      folder = await prisma.folder.create({
        data: {
          name: dept.name,
          departmentId: dept.id,
          description: `แฟ้มเอกสารเริ่มต้นของแผนก ${dept.name}`
        }
      });
      console.log(`  -> Created folder: ${folder.name} (ID: ${folder.id})`);
    } else {
      console.log(`  -> Folder already exists: ${folder.name}`);
    }

    // 3. Grant Folder Access to the department
    const access = await prisma.folderAccess.findFirst({
      where: { folderId: folder.id, departmentId: dept.id }
    });

    if (!access) {
      await prisma.folderAccess.create({
        data: {
          folderId: folder.id,
          departmentId: dept.id,
          canUpload: true,
          canEdit: true,
          canDelete: true,
        }
      });
      console.log(`  -> Granted full access to department: ${dept.name}`);
    }

    // 4. Move all existing documents in this department to this folder
    const updateResult = await prisma.document.updateMany({
      where: { 
        departmentId: dept.id,
        folderId: null // Only update if not already in a folder
      },
      data: {
        folderId: folder.id
      }
    });
    
    console.log(`  -> Moved ${updateResult.count} documents to folder ${folder.name}`);
  }

  console.log("Migration complete.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

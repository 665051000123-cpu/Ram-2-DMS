import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const docs = await prisma.document.findMany({
      where: { storagePath: null }
    });
    
    let updated = 0;
    const updates = [];
    
    for (const doc of docs) {
      if (!doc.fileUrl) continue;
      
      const relativePath = doc.fileUrl.replace("/uploads/", "").split('/').map(p => decodeURIComponent(p));
      
      const possibleDirs = [
        "D:\\DMS_Uploads",
        "D:\\DMS_Uploads 2",
        path.join(process.cwd(), "public", "uploads")
      ];
      
      for (const dir of possibleDirs) {
        const fullPath = path.join(dir, ...relativePath);
        if (fs.existsSync(fullPath)) {
          await prisma.document.update({
            where: { id: doc.id },
            data: { storagePath: dir }
          });
          updates.push(`Updated ${doc.id} -> ${dir}`);
          updated++;
          break;
        }
      }
    }
    
    return NextResponse.json({
      message: `Successfully backfilled ${updated} documents`,
      details: updates
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

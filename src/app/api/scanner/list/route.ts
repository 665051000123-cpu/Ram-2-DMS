import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cleanupOldScannerFiles } from "@/lib/cleanup";

function getFilesRecursively(dir: string, baseDir: string, filesList: any[] = []) {
  if (!fs.existsSync(dir)) return filesList;
  
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === "processed" || file.startsWith(".")) continue;
    
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getFilesRecursively(fullPath, baseDir, filesList);
    } else {
      filesList.push({
        name: file,
        path: path.relative(baseDir, fullPath).replace(/\\/g, "/"),
        size: stat.size,
        date: stat.mtime
      });
    }
  }
  return filesList;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let watchDir = path.join(process.cwd(), "scanned-docs");
    try {
      const setting = await prisma.systemSetting.findUnique({ where: { key: "SCANNER_DIR" } });
      if (setting && setting.value) {
        watchDir = setting.value;
      }
    } catch (e) {
      console.error("Failed to fetch SCANNER_DIR from DB", e);
    }

    // Passive Auto-Cleanup: Run asynchronously (fire-and-forget)
    setTimeout(() => {
      cleanupOldScannerFiles(watchDir, 3); // Delete older than 3 days
    }, 0);

    const files = getFilesRecursively(watchDir, watchDir);
    
    // Sort by date desc
    files.sort((a, b) => b.date.getTime() - a.date.getTime());

    return NextResponse.json({ files });
  } catch (error) {
    console.error("Error listing scanned files:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cleanupOldScannerFiles } from "@/lib/cleanup";
import fs from "fs";
import path from "path";

function getNewestFileSince(dir: string, baseDir: string, sinceMs: number): any {
  if (!fs.existsSync(dir)) return null;
  
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === "processed" || file.startsWith(".")) continue;
    
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      const found = getNewestFileSince(fullPath, baseDir, sinceMs);
      if (found) return found;
    } else {
      if (stat.mtimeMs > sinceMs || stat.birthtimeMs > sinceMs) {
        return {
          name: file,
          path: path.relative(baseDir, fullPath).replace(/\\/g, "/"),
          size: stat.size,
          date: stat.mtime
        };
      }
    }
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const since = searchParams.get("since");
    const clientWatchDir = searchParams.get("watchDir");
    if (!since) return NextResponse.json({ error: "Missing since parameter" }, { status: 400 });
    const sinceMs = parseInt(since, 10);

    let watchDir = path.join(process.cwd(), "scanned-docs");
    
    if (clientWatchDir) {
      watchDir = clientWatchDir;
    } else {
      try {
        const setting = await prisma.systemSetting.findUnique({ where: { key: "SCANNER_DIR" } });
        if (setting && setting.value) {
          watchDir = setting.value;
        }
      } catch (e) {
        console.error("Failed to fetch SCANNER_DIR from DB", e);
      }
    }

    // Passive Auto-Cleanup: Run asynchronously (fire-and-forget)
    setTimeout(() => {
      cleanupOldScannerFiles(watchDir, 3); // Delete older than 3 days
    }, 0);

    const newestFile = getNewestFileSince(watchDir, watchDir, sinceMs);
    
    if (newestFile) {
      return NextResponse.json({ file: newestFile });
    } else {
      return NextResponse.json({ file: null });
    }

  } catch (error) {
    console.error("Error checking latest scanned file:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

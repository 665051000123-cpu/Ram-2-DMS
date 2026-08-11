import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get("path");
    
    if (!filePath || filePath.includes("..") || path.isAbsolute(filePath)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    let watchDir = path.join(process.cwd(), "scanned-docs");
    try {
      const setting = await prisma.systemSetting.findUnique({ where: { key: "SCANNER_DIR" } });
      if (setting && setting.value) {
        watchDir = setting.value;
      }
    } catch (e) {
      console.error("Failed to fetch SCANNER_DIR from DB", e);
    }

    const fullPath = path.join(watchDir, filePath);
    
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const stat = fs.statSync(fullPath);
    const fileBuffer = fs.readFileSync(fullPath);
    
    const ext = path.extname(fullPath).toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === ".pdf") contentType = "application/pdf";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".png") contentType = "image/png";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": stat.size.toString(),
      },
    });

  } catch (error) {
    console.error("Error getting scanned file:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";
import { getUploadDir } from "@/lib/storage";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const resolvedParams = await params;
    const pathArray = resolvedParams.path;

    // Validate path to prevent directory traversal
    if (pathArray.some((p) => p.includes(".."))) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // We can look up the storage path from the DB based on the file URL
    const fileUrl = `/uploads/${pathArray.join("/")}`;
    const { prisma } = require("@/lib/prisma");
    const document = await prisma.document.findFirst({ where: { fileUrl } }) 
      || await prisma.documentVersion.findFirst({ where: { fileUrl } });
      
    const decodedPathArray = pathArray.map((p) => decodeURIComponent(p));
    let filePath = "";
    
    // Try 1: Database storagePath
    if (document?.storagePath) {
      filePath = path.join(document.storagePath, ...decodedPathArray);
    }
    
    // Try 2: Current System Upload Dir
    if (!filePath || !fs.existsSync(filePath)) {
      const currentUploadDir = await getUploadDir();
      const currentPath = path.join(currentUploadDir, ...decodedPathArray);
      
      if (fs.existsSync(currentPath)) {
        filePath = currentPath;
      } else {
        // Try 3: Default public/uploads
        const defaultUploadDir = path.join(process.cwd(), "public", "uploads");
        const fallbackPath = path.join(defaultUploadDir, ...decodedPathArray);
        
        if (fs.existsSync(fallbackPath)) {
          filePath = fallbackPath;
        } else {
          return new NextResponse("File Not Found: " + currentPath, { status: 404 });
        }
      }
    }

    const stat = fs.statSync(filePath);
    const fileStream = fs.createReadStream(filePath) as any;

    const ext = path.extname(filePath).toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === ".pdf") contentType = "application/pdf";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".gif") contentType = "image/gif";

    return new NextResponse(fileStream, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": stat.size.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("File serving error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

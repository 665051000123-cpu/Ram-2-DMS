import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { getUploadDir } from "@/lib/storage";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const resolvedParams = await params;
    const token = resolvedParams.token;
    const body = await req.json().catch(() => ({}));
    const { password } = body;

    const share = await prisma.externalShare.findUnique({
      where: { token },
      include: {
        document: true,
      },
    });

    if (!share || share.document.isDeleted) {
      return NextResponse.json({ error: "Share link not found or document is deleted" }, { status: 404 });
    }

    // Check expiry
    if (share.expiresAt && new Date() > share.expiresAt) {
      return NextResponse.json({ error: "Share link has expired" }, { status: 410 });
    }

    // Verify password if required
    if (share.password) {
      if (!password) {
        return NextResponse.json({ error: "Password required", requirePassword: true }, { status: 401 });
      }
      const isValid = await bcrypt.compare(password, share.password);
      if (!isValid) {
        return NextResponse.json({ error: "Invalid password" }, { status: 401 });
      }
    }

    // File serving logic (similar to regular document download)
    const doc = share.document;
    const baseUploadDir = await getUploadDir();
    
    // We check either storagePath or assume legacy path
    const folderName = doc.storagePath 
      ? path.dirname(doc.storagePath).split(path.sep).pop() 
      : 'uncategorized';
    
    let filePath = doc.storagePath || path.join(baseUploadDir, folderName || 'uncategorized', doc.fileUrl.split('/').pop() || '');

    if (!fs.existsSync(filePath)) {
      // Fallback
      filePath = path.join(baseUploadDir, doc.fileUrl.split('/').pop() || '');
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found on server" }, { status: 404 });
    }

    // Update view count
    await prisma.externalShare.update({
      where: { id: share.id },
      data: { viewCount: { increment: 1 } },
    });

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    let contentType = "application/octet-stream";
    if (ext === ".pdf") contentType = "application/pdf";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".png") contentType = "image/png";

    // Create response with headers to force download
    const filename = encodeURIComponent(doc.title + ext);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      },
    });

  } catch (error) {
    console.error("External share download error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const resolvedParams = await params;
    const token = resolvedParams.token;

    const share = await prisma.externalShare.findUnique({
      where: { token },
      include: { document: { select: { title: true, fileSize: true, fileType: true, isDeleted: true } } },
    });

    if (!share || share.document.isDeleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (share.expiresAt && new Date() > share.expiresAt) {
      return NextResponse.json({ error: "Expired", isExpired: true }, { status: 410 });
    }

    return NextResponse.json({
      title: share.document.title,
      fileSize: share.document.fileSize,
      fileType: share.document.fileType,
      hasPassword: !!share.password,
    });
  } catch (error) {
    console.error("Fetch share info error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

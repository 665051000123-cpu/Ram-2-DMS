import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, degrees } from "pdf-lib";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const docId = resolvedParams.id;

    const url = new URL(req.url);
    const isView = url.searchParams.get("view") === "true";
    const versionId = url.searchParams.get("versionId");

    // Find the document
    const document = await prisma.document.findUnique({
      where: { id: docId, isDeleted: false },
      include: { accessList: true, versions: true },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    // Check permissions
    if (session.user.role !== "SUPER_ADMIN") {
      const isUploader = document.uploaderId === session.user.id;
      const isSameDepartment = document.departmentId === session.user.departmentId;
      const hasSharedAccess = document.accessList.some((a: any) => a.userId === session.user.id);
      
      if (!isUploader && !isSameDepartment && !hasSharedAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Create Audit Log for DOWNLOAD/VIEW
    await prisma.auditLog.create({
      data: {
        action: isView ? "VIEW" : "DOWNLOAD",
        documentId: document.id,
        userId: session.user.id,
        details: isView ? "Viewed document" : "Downloaded document",
      },
    });

    // Resolve target file URLs
    let targetFileUrl = document.fileUrl;
    let targetStoragePath = document.storagePath;

    if (versionId) {
      const version = document.versions.find(v => v.id === versionId);
      if (version) {
        targetFileUrl = version.fileUrl;
        targetStoragePath = version.storagePath;
      } else {
        return NextResponse.json({ error: "Version not found" }, { status: 404 });
      }
    }

    // Serve the file directly instead of redirecting
    // fileUrl is like /uploads/แผนก/uuid.pdf
    const urlParts = targetFileUrl.split('/').filter(Boolean);
    // urlParts: ['uploads', 'แผนก', 'uuid.pdf']
    const relativePath = urlParts.slice(1).map(p => decodeURIComponent(p));
    
    let filePath = "";
    
    // Try 1: Database storagePath
    if (targetStoragePath) {
      filePath = path.join(targetStoragePath, ...relativePath);
    }
    
    // Try 2: Current System Upload Dir
    if (!filePath || !fs.existsSync(filePath)) {
      const currentUploadDir = await import("@/lib/storage").then(m => m.getUploadDir());
      const currentPath = path.join(currentUploadDir, ...relativePath);
      if (fs.existsSync(currentPath)) {
        filePath = currentPath;
      } else {
        // Try 3: Default public/uploads
        const defaultUploadDir = path.join(process.cwd(), "public", "uploads");
        const fallbackPath = path.join(defaultUploadDir, ...relativePath);
        if (fs.existsSync(fallbackPath)) {
          filePath = fallbackPath;
        } else {
          filePath = currentPath; // For error reporting
        }
      }
    }

    if (!fs.existsSync(filePath)) {
      if (isView) {
        const html = `
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: 'Sarabun', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f8fafc; color: #475569; }
                .container { text-align: center; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border: 1px solid #e2e8f0; }
                h1 { color: #ef4444; font-size: 1.5rem; margin-bottom: 0.5rem; }
                p { margin-bottom: 1rem; }
                .path { font-size: 0.875rem; color: #94a3b8; background: #f1f5f9; padding: 0.5rem; border-radius: 6px; word-break: break-all; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>⚠️ ไม่พบไฟล์เอกสาร</h1>
                <p>ระบบไม่พบไฟล์นี้ในเซิร์ฟเวอร์ อาจถูกลบไปแล้วหรือมีการเปลี่ยนโฟลเดอร์เก็บเอกสารใหม่</p>
                <div class="path">Path: ${filePath}</div>
              </div>
            </body>
          </html>
        `;
        return new NextResponse(html, {
          status: 404,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
      return NextResponse.json(
        { error: `File not found on server (Path: ${filePath})` },
        { status: 404 }
      );
    }

    const ext = path.extname(filePath).toLowerCase() || (document.fileType === 'application/pdf' ? '.pdf' : '');
    const filename = `${document.title}${ext}`;
    const encodedFilename = encodeURIComponent(filename).replace(/['()]/g, escape).replace(/\*/g, '%2A');
    const headers = new Headers();
    
    if (isView) {
      headers.set("Content-Disposition", `inline; filename*=UTF-8''${encodedFilename}`);
    } else {
      headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodedFilename}`);
    }

    // Check Watermark Setting
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: ["ENABLE_PDF_WATERMARK", "WATERMARK_TEXT"] } }
    });
    const watermarkSetting = settings.find((s: any) => s.key === "ENABLE_PDF_WATERMARK");
    const watermarkTextSetting = settings.find((s: any) => s.key === "WATERMARK_TEXT");

    const isPdf = document.fileType === "application/pdf" || ext === ".pdf";

    if (isPdf) {
      try {
        const fileBuffer = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(fileBuffer);
        pdfDoc.registerFontkit(fontkit);
        
        const fontPath = path.join(process.cwd(), "public", "fonts", "Sarabun-Regular.ttf");
        const fontBytes = fs.readFileSync(fontPath);
        const font = await pdfDoc.embedFont(fontBytes);
        const pages = pdfDoc.getPages();

        const customText = watermarkTextSetting?.value || "Confidential";
        // Clean up old variables if any, then append the user info
        const baseText = customText.replace(/{name}/g, "").replace(/{time}/g, "").replace(/-\s*-/g, "-").trim();
        const watermarkText = `${baseText} - Downloaded by ${session.user.name || "Unknown"} - ${new Date().toLocaleString('th-TH')}`;
        
        pages.forEach((page) => {
          const { width, height } = page.getSize();
          const fontSize = 36;
          const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
          
          page.drawText(watermarkText, {
            x: width / 2 - (textWidth / 2.5),
            y: height / 2 - (textWidth / 2.5),
            size: fontSize,
            font,
            color: rgb(0.4, 0.7, 0.9), // Light blue
            opacity: 0.4,
            rotate: degrees(45),
          });
        });

        const modifiedPdfBytes = await pdfDoc.save();
        headers.set("Content-Type", "application/pdf");
        headers.set("Content-Length", modifiedPdfBytes.length.toString());
        // Fix: Convert Uint8Array to Buffer for NextResponse
        const buffer = Buffer.from(modifiedPdfBytes);
        return new NextResponse(buffer, { headers });
      } catch (err: any) {
        console.error("Failed to watermark PDF:", err);
        return NextResponse.json({ error: "Watermark Error: " + err.message + " | Stack: " + err.stack }, { status: 500 });
      }
    }

    // Normal Download without Watermark
    const stat = fs.statSync(filePath);
    const fileStream = fs.createReadStream(filePath) as any;
    headers.set("Content-Type", document.fileType || "application/octet-stream");
    headers.set("Content-Length", stat.size.toString());

    return new NextResponse(fileStream, { headers });
  } catch (error) {
    console.error("Download/View Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

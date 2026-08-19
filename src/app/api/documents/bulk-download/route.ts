import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
const archiver = require("archiver");
import { PassThrough } from "stream";
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, degrees } from "pdf-lib";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentIds } = await req.json();
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json({ error: "No documentIds provided" }, { status: 400 });
    }

    const documents = await prisma.document.findMany({
      where: { id: { in: documentIds } },
      include: { accessList: true },
    });

    if (documents.length === 0) {
      return NextResponse.json({ error: "No valid documents found" }, { status: 404 });
    }

    // Filter documents the user actually has permission to download
    const allowedDocs = documents.filter(doc => {
      if (session.user.role === "SUPER_ADMIN") return true;
      const isUploader = doc.uploaderId === session.user.id;
      const isSameDepartment = doc.departmentId === session.user.departmentId;
      const hasSharedAccess = doc.accessList.some((a: any) => a.userId === session.user.id);
      return isUploader || isSameDepartment || hasSharedAccess;
    });

    if (allowedDocs.length === 0) {
      return NextResponse.json({ error: "Forbidden: No permission to download selected documents" }, { status: 403 });
    }

    // Create Audit Logs
    const auditLogs = allowedDocs.map((doc) => ({
      action: "DOWNLOAD" as const,
      documentId: doc.id,
      userId: session.user.id,
      details: "Downloaded document (Bulk Zip)",
    }));
    await prisma.auditLog.createMany({ data: auditLogs });

    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: ["ENABLE_PDF_WATERMARK", "WATERMARK_TEXT", "WATERMARK_COLOR", "WATERMARK_OPACITY"] } }
    });
    const watermarkSetting = settings.find((s: any) => s.key === "ENABLE_PDF_WATERMARK");
    const watermarkTextSetting = settings.find((s: any) => s.key === "WATERMARK_TEXT");
    const watermarkColorSetting = settings.find((s: any) => s.key === "WATERMARK_COLOR");
    const watermarkOpacitySetting = settings.find((s: any) => s.key === "WATERMARK_OPACITY");
    const isWatermarkEnabled = watermarkSetting?.value === "true";

    const archive = archiver("zip", { zlib: { level: 9 } });
    const passThrough = new PassThrough();

    // Prepare response headers
    const headers = new Headers();
    headers.set("Content-Type", "application/zip");
    headers.set("Content-Disposition", `attachment; filename="bulk_download_${new Date().getTime()}.zip"`);

    archive.on("error", (err: any) => {
      console.error("Archiver error:", err);
      passThrough.end();
    });

    archive.pipe(passThrough);

    // Add files to archive
    for (const doc of allowedDocs) {
      let filePath = "";
      const urlParts = doc.fileUrl.split('/').filter(Boolean);
      const relativePath = urlParts.slice(1).map(p => decodeURIComponent(p));
      
      if (doc.storagePath) {
        filePath = path.join(doc.storagePath, ...relativePath);
      }
      
      if (!filePath || !fs.existsSync(filePath)) {
        const defaultUploadDir = path.join(process.cwd(), "public", "uploads");
        filePath = path.join(defaultUploadDir, ...relativePath);
      }

      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath).toLowerCase() || (doc.fileType === 'application/pdf' ? '.pdf' : '');
        // Replace invalid chars in filename
        let filename = `${doc.title}${ext}`.replace(/[/\\?%*:|"<>]/g, '-');
        
        const isPdf = doc.fileType === "application/pdf" || ext === ".pdf";
        const isExpired = doc.retentionPeriod && new Date(doc.retentionPeriod) < new Date();
        const isDeleted = doc.isDeleted;
        
        // บังคับมีลายน้ำเสมอสำหรับเอกสารที่ถูกลบ หรือหมดอายุ (ต่อให้การตั้งค่าหลักจะปิดอยู่)
        const shouldWatermark = isWatermarkEnabled || isDeleted || isExpired;

        if (isPdf && shouldWatermark) {
          try {
            const fileBuffer = fs.readFileSync(filePath);
            const pdfDoc = await PDFDocument.load(fileBuffer);
            pdfDoc.registerFontkit(fontkit);
            const fontPath = path.join(process.cwd(), "public", "fonts", "Sarabun-Regular.ttf");
            const fontBytes = fs.readFileSync(fontPath);
            const font = await pdfDoc.embedFont(fontBytes);
            const pages = pdfDoc.getPages();

            const customText = watermarkTextSetting?.value || "Confidential";
            const baseText = customText.replace(/{name}/g, "").replace(/{time}/g, "").replace(/-\s*-/g, "-").trim();
            const watermarkText = `${baseText} - ${session.user.name || "Unknown"} - ${new Date().toLocaleString('th-TH')}`;
            
            const watermarkColorHex = watermarkColorSetting?.value || "#66b2e5";
            const cleanHex = watermarkColorHex.replace('#', '');
            const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
            const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
            const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
            
            const watermarkOpacityRaw = watermarkOpacitySetting?.value || "5";
            let opacityVal = parseFloat(watermarkOpacityRaw) / 100;
            if (isNaN(opacityVal) || opacityVal <= 0) opacityVal = 0.05;
            
            const fontSize = 16;
            const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
            const textHeight = font.heightAtSize(fontSize);
            const xStep = textWidth + 30;
            const yStep = textHeight + 50;

            pages.forEach((page) => {
              const { width, height } = page.getSize();
              const diagonal = Math.sqrt(width * width + height * height);
              
              let row = 0;
              for (let ry = -diagonal; ry < diagonal * 2; ry += yStep) {
                const rowOffsetX = (row % 2 === 0) ? 0 : xStep / 2;
                
                for (let rx = -diagonal; rx < diagonal * 2; rx += xStep) {
                  const currentRx = rx + rowOffsetX;
                  const radians = Math.PI / 4;
                  const x = currentRx * Math.cos(radians) - ry * Math.sin(radians);
                  const y = currentRx * Math.sin(radians) + ry * Math.cos(radians);
                  
                  page.drawText(watermarkText, {
                    x,
                    y,
                    size: fontSize,
                    font,
                    color: rgb(r, g, b),
                    opacity: opacityVal,
                    rotate: degrees(45),
                  });
                }
                row++;
              }
            });

            const modifiedPdfBytes = await pdfDoc.save();
            archive.append(Buffer.from(modifiedPdfBytes), { name: filename });
          } catch (err) {
            console.error("Watermark failed for doc:", doc.id, err);
            archive.file(filePath, { name: filename });
          }
        } else {
          archive.file(filePath, { name: filename });
        }
      }
    }

    archive.finalize();

    return new NextResponse(passThrough as any, { headers });
  } catch (error: any) {
    console.error("Bulk Download Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}



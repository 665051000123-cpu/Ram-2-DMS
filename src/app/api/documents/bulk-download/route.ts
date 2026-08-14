import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import { PassThrough } from "stream";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";

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
      where: { id: { in: documentIds }, isDeleted: false },
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

    const watermarkSetting = await prisma.systemSetting.findUnique({ where: { key: "ENABLE_PDF_WATERMARK" } });
    const isWatermarkEnabled = watermarkSetting?.value === "true";

    const archive = archiver("zip", { zlib: { level: 9 } });
    const passThrough = new PassThrough();

    // Prepare response headers
    const headers = new Headers();
    headers.set("Content-Type", "application/zip");
    headers.set("Content-Disposition", `attachment; filename="bulk_download_${new Date().getTime()}.zip"`);

    archive.on("error", (err) => {
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
        const isSharedExternally = doc.accessList.length > 0;

        if (isWatermarkEnabled && isPdf && isSharedExternally) {
          try {
            const fileBuffer = fs.readFileSync(filePath);
            const pdfDoc = await PDFDocument.load(fileBuffer);
            const pages = pdfDoc.getPages();
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const watermarkText = `Confidential - Downloaded by ${session.user.name} - ${new Date().toLocaleString('th-TH')}`;
            
            pages.forEach((page) => {
              page.drawText(watermarkText, {
                x: 50, y: 50, size: 14, font, color: rgb(0.85, 0.2, 0.2), opacity: 0.5, rotate: degrees(45),
              });
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

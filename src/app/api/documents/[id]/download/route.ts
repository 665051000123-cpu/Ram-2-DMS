import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";

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

    // Find the document
    const document = await prisma.document.findUnique({
      where: { id: docId, isDeleted: false },
      include: { accessList: true },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    // Check permissions
    if (session.user.role !== "SUPER_ADMIN") {
      if (document.visibility === "PRIVATE") {
        const hasAccess =
          document.uploaderId === session.user.id ||
          document.accessList.some((a: any) => a.userId === session.user.id);
        if (!hasAccess)
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      } else if (document.visibility === "DEPARTMENT") {
        if (document.departmentId !== session.user.departmentId)
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

    // Serve the file directly instead of redirecting
    const baseUploadDir = await import("@/lib/storage").then(m => m.getUploadDir());
    
    // fileUrl is like /uploads/แผนก/uuid.pdf
    const urlParts = document.fileUrl.split('/').filter(Boolean);
    // urlParts: ['uploads', 'แผนก', 'uuid.pdf']
    const relativePath = urlParts.slice(1).map(p => decodeURIComponent(p));
    const filePath = path.join(baseUploadDir, ...relativePath);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: `File not found on server (Path: ${filePath})` },
        { status: 404 }
      );
    }

    const stat = fs.statSync(filePath);
    const fileStream = fs.createReadStream(filePath) as any;

    const ext = path.extname(filePath).toLowerCase() || (document.fileType === 'application/pdf' ? '.pdf' : '');
    const filename = `${document.title}${ext}`;
    
    // Encode filename for Content-Disposition to support Thai characters
    const encodedFilename = encodeURIComponent(filename).replace(/['()]/g, escape).replace(/\*/g, '%2A');

    const headers = new Headers();
    headers.set("Content-Type", document.fileType || "application/octet-stream");
    headers.set("Content-Length", stat.size.toString());
    
    if (isView) {
      headers.set("Content-Disposition", `inline; filename*=UTF-8''${encodedFilename}`);
    } else {
      headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodedFilename}`);
    }

    return new NextResponse(fileStream, { headers });
  } catch (error) {
    console.error("Download/View Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

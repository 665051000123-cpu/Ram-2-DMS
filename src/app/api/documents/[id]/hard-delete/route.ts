import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRolePermissions } from "@/lib/server-permissions";
import fs from "fs";
import path from "path";
import { getUploadDir } from "@/lib/storage";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const permissions = await getRolePermissions(session.user.role as string);
    if (
      session.user.role !== "SUPER_ADMIN" &&
      !permissions.doc_delete
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const resolvedParams = await params;
    const docId = resolvedParams.id;

    const document = await prisma.document.findUnique({
      where: { id: docId },
      include: { versions: true },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    // Optional: Delete physical files from UPLOAD_DIR
    try {
      if (document.fileUrl) {
        // fileUrl is like "/uploads/Dept/file.pdf"
        const relativePath = document.fileUrl.replace("/uploads/", "");
        const baseUploadDir = await getUploadDir();
        const filePath = path.join(baseUploadDir, relativePath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      // Also delete version files
      for (const v of document.versions) {
        if (v.fileUrl && v.fileUrl !== document.fileUrl) {
          const relPath = v.fileUrl.replace("/uploads/", "");
          const baseUploadDir = await getUploadDir();
          const vPath = path.join(baseUploadDir, relPath);
          if (fs.existsSync(vPath)) {
            fs.unlinkSync(vPath);
          }
        }
      }
    } catch (fsError) {
      console.error("File deletion error:", fsError);
    }

    // Create Audit Log before deleting document (or it might fail if cascading is off)
    await prisma.auditLog.create({
      data: {
        action: "DELETE",
        userId: session.user.id,
        details: `Permanently deleted document: ${document.title} (ID: ${document.id})`,
      },
    });

    // Hard delete from DB
    await prisma.document.delete({
      where: { id: docId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Hard Delete Document Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

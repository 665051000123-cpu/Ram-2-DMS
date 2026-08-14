import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { versionId } = await req.json();
    if (!versionId) {
      return NextResponse.json({ error: "versionId is required" }, { status: 400 });
    }

    const resolvedParams = await params;
    const docId = resolvedParams.id;

    // Get current document and the target version
    const [document, targetVersion] = await Promise.all([
      prisma.document.findUnique({
        where: { id: docId },
        include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
      }),
      prisma.documentVersion.findUnique({
        where: { id: versionId },
      }),
    ]);

    if (!document || !targetVersion) {
      return NextResponse.json(
        { error: "Document or Version not found" },
        { status: 404 },
      );
    }

    if (targetVersion.documentId !== docId) {
      return NextResponse.json(
        { error: "Version does not belong to this document" },
        { status: 400 },
      );
    }

    const currentMaxVersion = document.versions.length > 0 ? document.versions[0].version : 1;
    const newVersionNumber = currentMaxVersion + 1;

    // Run in transaction: update doc, create new version, create audit log
    await prisma.$transaction(async (tx) => {
      // 1. Update Document
      await tx.document.update({
        where: { id: docId },
        data: {
          fileUrl: targetVersion.fileUrl,
          fileType: targetVersion.fileType,
          fileSize: targetVersion.fileSize,
          storagePath: targetVersion.storagePath,
          extractedText: targetVersion.extractedText,
        },
      });

      // 2. Create new DocumentVersion
      await tx.documentVersion.create({
        data: {
          documentId: docId,
          version: newVersionNumber,
          fileUrl: targetVersion.fileUrl,
          fileType: targetVersion.fileType,
          fileSize: targetVersion.fileSize,
          storagePath: targetVersion.storagePath,
          extractedText: targetVersion.extractedText,
          uploaderId: session.user.id,
        },
      });

      // 3. Create AuditLog
      await tx.auditLog.create({
        data: {
          action: "RESTORE_VERSION" as any, // Using as any in case Prisma types are stale
          userId: session.user.id,
          documentId: docId,
          details: `Restored to version ${targetVersion.version}`,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Restore Document Version Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

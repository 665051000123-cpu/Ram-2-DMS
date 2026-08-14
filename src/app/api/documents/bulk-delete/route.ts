import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    
    const isSuperAdmin = session.user.role === "SUPER_ADMIN";
    
    // Validate that the user can delete these documents
    const documents = await prisma.document.findMany({
      where: { id: { in: documentIds }, isDeleted: false }
    });

    if (documents.length === 0) {
      return NextResponse.json({ error: "No valid documents found" }, { status: 404 });
    }

    // Filter documents the user actually has permission to delete
    const allowedIds = documents.filter(doc => {
      if (isSuperAdmin) return true;
      return doc.uploaderId === session.user.id || doc.departmentId === session.user.departmentId;
    }).map(doc => doc.id);

    if (allowedIds.length === 0) {
      return NextResponse.json({ error: "Forbidden: No permission to delete selected documents" }, { status: 403 });
    }

    // Perform soft delete
    await prisma.document.updateMany({
      where: { id: { in: allowedIds } },
      data: { isDeleted: true }
    });

    // Create Audit Logs
    const auditLogs = allowedIds.map((id) => ({
      action: "DELETE" as const,
      documentId: id,
      userId: session.user.id,
      details: "Soft-deleted document (Bulk)",
    }));
    await prisma.auditLog.createMany({ data: auditLogs });

    return NextResponse.json({ 
      message: "Documents deleted successfully",
      deletedCount: allowedIds.length,
      skippedCount: documentIds.length - allowedIds.length
    });
  } catch (error: any) {
    console.error("Bulk Delete Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

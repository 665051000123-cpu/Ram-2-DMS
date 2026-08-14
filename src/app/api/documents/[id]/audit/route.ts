import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    // Check permissions
    const document = await prisma.document.findUnique({
      where: { id: docId, isDeleted: false },
      include: { accessList: true },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (session.user.role !== "SUPER_ADMIN") {
      const isUploader = document.uploaderId === session.user.id;
      const isSameDepartment = document.departmentId === session.user.departmentId;
      const hasSharedAccess = document.accessList.some((a: any) => a.userId === session.user.id);
      
      if (!isUploader && !isSameDepartment && !hasSharedAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Fetch Audit Logs
    const auditLogs = await prisma.auditLog.findMany({
      where: { documentId: docId },
      include: {
        user: {
          select: { name: true, role: true, department: { select: { name: true } } }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(auditLogs);
  } catch (error: any) {
    console.error("Audit Log Fetch Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

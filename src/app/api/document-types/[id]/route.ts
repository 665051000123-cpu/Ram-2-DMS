import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const docType = await prisma.documentType.findUnique({ where: { id: resolvedParams.id } });
    
    if (!docType) {
      return NextResponse.json({ error: "Document Type not found" }, { status: 404 });
    }

    // Role checks
    if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "DEPT_HEAD") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (session.user.role === "DEPT_HEAD" && docType.departmentId !== session.user.departmentId) {
      return NextResponse.json({ error: "You can only update document types for your own department" }, { status: 403 });
    }

    const { name, description, departmentId, schema } = await req.json();

    const updated = await prisma.documentType.update({
      where: { id: resolvedParams.id },
      data: {
        name,
        description,
        departmentId: departmentId || null,
        schema
      }
    });

    return NextResponse.json({ success: true, documentType: updated });
  } catch (error) {
    console.error("Update DocumentType Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const docType = await prisma.documentType.findUnique({ where: { id: resolvedParams.id }, include: { _count: { select: { documents: true } } } });
    
    if (!docType) {
      return NextResponse.json({ error: "Document Type not found" }, { status: 404 });
    }

    if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "DEPT_HEAD") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (session.user.role === "DEPT_HEAD" && docType.departmentId !== session.user.departmentId) {
      return NextResponse.json({ error: "You can only delete document types for your own department" }, { status: 403 });
    }

    if (docType._count.documents > 0) {
      return NextResponse.json({ error: "Cannot delete because there are documents using this type" }, { status: 400 });
    }

    await prisma.documentType.delete({ where: { id: resolvedParams.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete DocumentType Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

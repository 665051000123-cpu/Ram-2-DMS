import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Only Dev can manage this." }, { status: 401 });
    }

    const { id } = await context.params;
    const { name, description, visibleTo, schema } = await req.json();

    if (!name || !schema || !visibleTo || visibleTo.length === 0) {
      return NextResponse.json({ error: "Missing required fields or visibility" }, { status: 400 });
    }

    const docType = await prisma.documentType.update({
      where: { id },
      data: {
        name,
        description,
        departmentId: null,
        visibleTo: visibleTo,
        schema
      }
    });

    return NextResponse.json({ success: true, documentType: docType });
  } catch (error) {
    console.error("Update DocumentType Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Only Dev can manage this." }, { status: 401 });
    }

    const { id } = await context.params;
    const docType = await prisma.documentType.findUnique({ 
      where: { id }, 
      include: { _count: { select: { documents: true } } } 
    });
    
    if (!docType) {
      return NextResponse.json({ error: "Document Type not found" }, { status: 404 });
    }

    if (docType._count.documents > 0) {
      return NextResponse.json({ error: "Cannot delete because there are documents using this type" }, { status: 400 });
    }

    await prisma.documentType.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete DocumentType Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

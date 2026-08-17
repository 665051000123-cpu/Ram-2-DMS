import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get("departmentId");
    const manage = searchParams.get("manage") === "true";

    let whereClause: any = {};
    
    // For normal users, only show global templates and their own department's templates
    if (session.user.role !== "SUPER_ADMIN") {
      if (manage && session.user.role === "DEPT_HEAD") {
        // When managing document types, DEPT_HEAD only sees their own department's types (no Global)
        whereClause.departmentId = session.user.departmentId;
      } else {
        whereClause.OR = [
          { departmentId: null },
          { departmentId: session.user.departmentId }
        ];
      }
    } else {
      // Super admin can filter by department if provided
      if (departmentId) {
        whereClause.departmentId = departmentId === 'global' ? null : departmentId;
      }
    }

    const documentTypes = await prisma.documentType.findMany({
      where: whereClause,
      include: { department: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ documentTypes });
  } catch (error) {
    console.error("Fetch DocumentTypes Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, departmentId, schema } = await req.json();

    if (!name || !schema) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    // Only SUPER_ADMIN can create global templates
    if (departmentId === null && session.user.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Only SUPER_ADMIN can create global document types" }, { status: 403 });
    }

    // DEPT_HEAD can only create for their own department
    if (session.user.role === "DEPT_HEAD" && departmentId !== session.user.departmentId) {
        return NextResponse.json({ error: "You can only create document types for your own department" }, { status: 403 });
    }

    const docType = await prisma.documentType.create({
      data: {
        name,
        description,
        departmentId: departmentId || null,
        schema
      }
    });

    return NextResponse.json({ success: true, documentType: docType }, { status: 201 });
  } catch (error) {
    console.error("Create DocumentType Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

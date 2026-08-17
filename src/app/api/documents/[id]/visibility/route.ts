import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        department_documentshareddepartments: {
          select: { id: true }
        }
      }
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Check permissions
    if (session.user.role !== "SUPER_ADMIN" && document.uploaderId !== session.user.id) {
       // Only owner or SUPER_ADMIN should be able to view/edit visibility
       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sharedDepartments = document.department_documentshareddepartments.map((d: any) => d.id);

    return NextResponse.json({
      visibility: document.visibility,
      sharedDepartments
    });
  } catch (error: any) {
    console.error("Error fetching visibility:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { visibility, sharedDepartments } = body;

    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Check permissions - only owner or super admin can change visibility
    if (session.user.role !== "SUPER_ADMIN" && document.uploaderId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData: any = {
      visibility: visibility as any,
    };

    if (visibility === "CUSTOM") {
      updateData.department_documentshareddepartments = {
        set: (sharedDepartments || []).map((deptId: string) => ({ id: deptId }))
      };
    } else {
      updateData.department_documentshareddepartments = {
        set: []
      };
    }

    await prisma.document.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating visibility:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

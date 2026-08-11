import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const resolvedParams = await params;
    const deptId = resolvedParams.id;
    const { name } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Department name is required" },
        { status: 400 },
      );
    }

    const existingDept = await prisma.department.findUnique({
      where: { name: name.trim() },
    });

    if (existingDept && existingDept.id !== deptId) {
      return NextResponse.json(
        { error: "มีแผนกนี้ในระบบแล้ว" },
        { status: 400 },
      );
    }

    const updatedDept = await prisma.department.update({
      where: { id: deptId },
      data: { name: name.trim() },
    });

    return NextResponse.json({ department: updatedDept });
  } catch (error) {
    console.error("Update Department Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const resolvedParams = await params;
    const deptId = resolvedParams.id;

    // First check if the department exists
    const department = await prisma.department.findUnique({
      where: { id: deptId },
      include: {
        _count: { select: { users: true, documents: true } },
      },
    });

    if (!department) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 },
      );
    }

    // Protection: DO NOT delete if there are users or documents
    if (department._count.users > 0 || department._count.documents > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete department because it contains users or documents. Please move or delete them first.",
        },
        { status: 400 },
      );
    }

    await prisma.department.delete({
      where: { id: deptId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Department Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

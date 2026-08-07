import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const departments = await prisma.department.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { users: true, documents: true },
        },
      },
    });

    return NextResponse.json(departments);
  } catch (error) {
    console.error("Fetch Departments Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { name } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: "Department name is required" },
        { status: 400 },
      );
    }

    // Check if department already exists
    const existingDept = await prisma.department.findUnique({
      where: { name },
    });

    if (existingDept) {
      return NextResponse.json(
        { error: "Department already exists" },
        { status: 400 },
      );
    }

    const newDepartment = await prisma.department.create({
      data: { name },
    });

    return NextResponse.json({ success: true, department: newDepartment });
  } catch (error) {
    console.error("Create Department Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

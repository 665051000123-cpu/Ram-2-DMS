import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { getUploadDir } from "@/lib/storage";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin = session.user.role === "SUPER_ADMIN";

    const departments = await prisma.department.findMany({
      orderBy: { createdAt: "desc" },
      include: isSuperAdmin ? {
        _count: {
          select: { users: true, documents: true },
        },
      } : undefined,
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

    // Create physical folder
    try {
      const baseUploadDir = await getUploadDir();
      const deptDir = path.join(baseUploadDir, name);
      if (!fs.existsSync(deptDir)) {
        fs.mkdirSync(deptDir, { recursive: true });
      }
    } catch (fsError) {
      console.error("Failed to create physical folder:", fsError);
      // We don't fail the API request if the physical folder fails to create,
      // as the system will try to create it again on the first upload.
    }

    return NextResponse.json({ success: true, department: newDepartment });
  } catch (error) {
    console.error("Create Department Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

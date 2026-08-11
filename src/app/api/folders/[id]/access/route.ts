import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const folderId = resolvedParams.id;

    const accesses = await prisma.folderAccess.findMany({
      where: { folderId },
      include: { 
        department: true,
        user: { select: { id: true, name: true, email: true } }
      }
    });

    return NextResponse.json({ accesses });
  } catch (error: any) {
    console.error("Error fetching folder access:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const folderId = resolvedParams.id;
    const { departmentIds, userIds, roles } = await req.json();

    const depts = Array.isArray(departmentIds) ? departmentIds : [];
    const users = Array.isArray(userIds) ? userIds : [];
    const roleList = Array.isArray(roles) ? roles : [];

    // Use a transaction to delete all existing and insert new ones
    await prisma.$transaction(async (tx) => {
      await tx.folderAccess.deleteMany({
        where: { folderId }
      });

      const accessData = [
        ...depts.map((deptId: string) => ({
          folderId,
          departmentId: deptId
        })),
        ...users.map((userId: string) => ({
          folderId,
          userId
        })),
        ...roleList.map((role: any) => ({
          folderId,
          role
        }))
      ];

      if (accessData.length > 0) {
        await tx.folderAccess.createMany({
          data: accessData
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating folder access:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

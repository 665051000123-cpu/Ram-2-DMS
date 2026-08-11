import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRolePermissions } from "@/lib/server-permissions";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { department: true }
    });

    if (!user) {
       return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let folders;
    
    if (session.user.role === "SUPER_ADMIN") {
      folders = await prisma.folder.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          department: true,
          parent: { select: { id: true, name: true } },
          _count: { select: { documents: { where: { isDeleted: false } } } }
        }
      });
    } else {
      // Rule: See own department's folders + general folders (null department)
      folders = await prisma.folder.findMany({
        where: {
          OR: [
            { departmentId: user.departmentId },
            { departmentId: null },
            ...(user.departmentId ? [{ accessList: { some: { departmentId: user.departmentId } } }] : []),
            { accessList: { some: { userId: user.id } } },
            { accessList: { some: { role: user.role } } }
          ]
        },
        orderBy: { createdAt: "desc" },
        include: {
          department: true,
          parent: { select: { id: true, name: true } },
          _count: { select: { documents: { where: { isDeleted: false } } } }
        }
      });
    }

    return NextResponse.json({ folders });
  } catch (error: any) {
    console.error("Error fetching folders:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const perms = await getRolePermissions(session.user.role as any);
    if (session.user.role !== "SUPER_ADMIN" && !perms.menu_folders && session.user.role !== "DEPT_HEAD") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let { name, description, departmentId, parentId } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (session.user.role !== "SUPER_ADMIN") {
      // Force department ID to the user's own department
      const user = await prisma.user.findUnique({ where: { id: session.user.id } });
      if (!user?.departmentId) {
        return NextResponse.json({ error: "No department assigned" }, { status: 400 });
      }
      departmentId = user.departmentId;
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        description,
        departmentId: departmentId || null,
        parentId: parentId || null,
      }
    });

    return NextResponse.json({ success: true, folder });
  } catch (error: any) {
    console.error("Error creating folder:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

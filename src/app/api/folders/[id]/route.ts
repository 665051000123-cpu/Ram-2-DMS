import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRolePermissions } from "@/lib/server-permissions";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    const perms = await getRolePermissions(session.user.role as any);
    if (session.user.role !== "SUPER_ADMIN" && !perms.menu_folders) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const resolvedParams = await params;
    const { name, description, departmentId, parentId } = await req.json();

    const folder = await prisma.folder.update({
      where: { id: resolvedParams.id },
      data: {
        name,
        description,
        departmentId: departmentId || null,
        parentId: parentId || null
      }
    });

    return NextResponse.json({ success: true, folder });
  } catch (error: any) {
    console.error("Error updating folder:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    const perms = await getRolePermissions(session.user.role as any);
    if (session.user.role !== "SUPER_ADMIN" && !perms.menu_folders) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const resolvedParams = await params;
    const folderId = resolvedParams.id;

    // Check if folder has documents
    const docCount = await prisma.document.count({
      where: { folderId }
    });

    if (docCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete folder with existing documents. Move or delete them first." },
        { status: 400 }
      );
    }

    await prisma.folder.delete({
      where: { id: folderId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting folder:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

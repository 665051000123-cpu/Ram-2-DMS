import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    // Check permissions
    if (
      !session?.user ||
      (session.user.role !== "SUPER_ADMIN" &&
        session.user.role !== "DEPT_HEAD")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const resolvedParams = await params;
    const userId = resolvedParams.id;

    // Prevent deleting oneself
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 },
      );
    }

    // Ensure the user being deleted is in the same department
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userToDelete) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (
      userToDelete.departmentId !== session.user.departmentId &&
      session.user.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        { error: "Unauthorized to delete this user" },
        { status: 403 },
      );
    }

    // Delete user
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete User Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    // Check permissions
    if (
      !session?.user ||
      (session.user.role !== "SUPER_ADMIN" &&
        session.user.role !== "DEPT_HEAD")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const resolvedParams = await params;
    const userId = resolvedParams.id;
    const { name, email, role, departmentId, password, isActive } = await req.json();

    if (!name || !email || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const userToUpdate = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userToUpdate) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (
      userToUpdate.departmentId !== session.user.departmentId &&
      session.user.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        { error: "Unauthorized to update this user" },
        { status: 403 },
      );
    }

    // Check if new email is already taken by someone else
    if (email !== userToUpdate.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        return NextResponse.json(
          { error: "รหัสพนักงาน (H.N.) นี้มีผู้ใช้งานแล้ว" },
          { status: 400 },
        );
      }
    }

    // Map role back to Prisma's expected ENUM if needed
    const mappedRole = role === "DEPT_HEAD" ? "DEPT_HEAD" : role;

    // Handle departmentId empty string
    let targetDepartmentId = departmentId;
    if (targetDepartmentId === "") {
      targetDepartmentId = userToUpdate.departmentId;
    }

    // Handle password update if provided and user is SUPER_ADMIN
    const dataToUpdate: any = {
      name,
      email,
      role: mappedRole,
      departmentId: targetDepartmentId,
    };

    if (isActive !== undefined) {
      dataToUpdate.isActive = isActive;
    }

    if (password && session.user.role === "SUPER_ADMIN") {
      dataToUpdate.passwordHash = await bcrypt.hash(password, 10);
      dataToUpdate.forcePasswordChange = true;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        department: {
          select: { id: true, name: true },
        },
      },
    });

    // Map role back for the frontend
    const userToReturn = {
      ...updatedUser,
      role:
        updatedUser.role === "DEPT_HEAD" ? "DEPT_HEAD" : updatedUser.role,
    };

    return NextResponse.json({ success: true, user: userToReturn });
  } catch (error: any) {
    console.error("Update User Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}

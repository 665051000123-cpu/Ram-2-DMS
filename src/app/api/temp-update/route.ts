import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const email = "000000";
    const newDeptName = "แผนก Dev";

    let dept = await prisma.department.findUnique({
      where: { name: newDeptName },
    });

    if (!dept) {
      dept = await prisma.department.create({
        data: { name: newDeptName },
      });
    }

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { departmentId: dept.id },
    });

    return NextResponse.json({ success: true, updatedUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin = session.user.role === "SUPER_ADMIN";
    const deptId = session.user.departmentId;

    const baseWhere = isSuperAdmin ? {} : { departmentId: deptId as string };

    const totalDocs = await prisma.document.count({ where: baseWhere });

    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);
    const endOfCurrentMonth = endOfMonth(now);

    const docsThisMonth = await prisma.document.count({
      where: {
        ...baseWhere,
        createdAt: { gte: startOfCurrentMonth, lte: endOfCurrentMonth },
      },
    });

    // Recent Activity (Audit logs)
    const recentActivity = await prisma.auditLog.findMany({
      where: isSuperAdmin ? {} : { user: { departmentId: deptId } },
      include: {
        user: { select: { name: true } },
        document: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      totalDocs,
      docsThisMonth,
      recentActivity,
    });
  } catch (error) {
    console.error("Analytics Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

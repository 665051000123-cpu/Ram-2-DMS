export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getRolePermissions } from "@/lib/server-permissions";
import AuditLogList from "@/components/AuditLogList";

export default async function AuditLogsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const permissions = await getRolePermissions(session.user.role);

  if (!permissions.menu_audit) {
    return (
      <div className="p-6 text-center mt-20">
        <h1 className="text-2xl font-bold text-red-600 dark:text-red-300">
          ปฏิเสธการเข้าถึง
        </h1>
        <p className="text-slate-500 dark:text-white mt-2">
          คุณไม่มีสิทธิ์เข้าถึงหน้านี้ เฉพาะผู้ดูแลระบบ หรือหัวหน้าแผนกเท่านั้น
        </p>
      </div>
    );
  }

  // Determine query scope
  // Super admin sees all, Department Head sees only logs for documents in their department
  const whereClause: any =
    session.user.role === "SUPER_ADMIN"
      ? {}
      : { document: { departmentId: session.user.departmentId as string } };

  const logs = await prisma.auditLog.findMany({
    where: whereClause,
    include: {
      user: { select: { name: true, role: true } },
      document: {
        select: { title: true, department: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const allDepartments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true }
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          ประวัติการใช้งาน (Audit Logs)
        </h1>
        <p className="text-slate-500 dark:text-white mt-1">
          ตรวจสอบประวัติการอัปโหลด เปิดดู ดาวน์โหลด และลบเอกสาร
        </p>
      </div>

      <AuditLogList 
        initialLogs={logs} 
        currentUserRole={session.user.role} 
        allDepartments={allDepartments}
      />
    </div>
  );
}

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getRolePermissions } from "@/lib/server-permissions";
import ExpiredDocumentList from "./ExpiredDocumentList";

export default async function ExpiredDocumentsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const permissions = await getRolePermissions(session.user.role);

  if (!permissions.menu_trash) {
    return (
      <div className="p-6 text-center mt-20">
        <h1 className="text-2xl font-bold text-red-600 dark:text-red-300">
          ปฏิเสธการเข้าถึง
        </h1>
        <p className="text-slate-500 dark:text-white mt-2">
          หน้านี้สงวนไว้สำหรับผู้ดูแลระบบหรือหัวหน้าแผนกเท่านั้น
        </p>
      </div>
    );
  }

  // Find documents where retentionPeriod is passed (expired) and not yet deleted
  let whereClause: any = { 
    isDeleted: false,
    retentionPeriod: {
      lt: new Date()
    }
  };
  
  if (session.user.role === "DEPT_HEAD") {
    whereClause.departmentId = session.user.departmentId;
  }

  const documents = await prisma.document.findMany({
    where: whereClause,
    include: {
      uploader: { select: { name: true } },
      department: { select: { name: true } },
    },
    orderBy: { retentionPeriod: "asc" },
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          เอกสารรอทำลาย (หมดอายุการจัดเก็บ)
        </h1>
        <p className="text-slate-500 dark:text-white mt-1">
          เอกสารที่ครบกำหนดอายุการจัดเก็บแล้ว สามารถตรวจสอบและกดลบ (Soft Delete) เพื่อส่งไปยังถังขยะ หรือลบถาวรได้
        </p>
      </div>

      <ExpiredDocumentList initialDocuments={documents as any} />
    </div>
  );
}

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  // 1. Total Storage
  const documents = await prisma.document.findMany({
    select: { fileSize: true },
  });
  const totalStorageBytes = documents.reduce(
    (acc, doc) => acc + (doc.fileSize || 0),
    0,
  );
  const totalStorageMB = (totalStorageBytes / (1024 * 1024)).toFixed(2);

  // 2. Department Stats (Number of Documents per Department)
  const deptDocs = await prisma.document.groupBy({
    by: ["departmentId"],
    _count: {
      id: true,
    },
  });

  const departments = await prisma.department.findMany({
    select: { id: true, name: true },
  });

  const deptMap = departments.reduce((acc: any, d) => {
    acc[d.id] = d.name;
    return acc;
  }, {});

  const departmentStats = deptDocs.map((stat) => ({
    name: deptMap[stat.departmentId] || "ไม่ระบุ",
    value: stat._count.id,
  }));

  // 3. Top Downloaded Documents
  const downloads = await prisma.auditLog.groupBy({
    by: ["documentId"],
    where: { action: "DOWNLOAD", documentId: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 5,
  });

  const docIds = downloads.map((d) => d.documentId as string);
  const topDocsDetails = await prisma.document.findMany({
    where: { id: { in: docIds } },
    select: { id: true, title: true },
  });

  const topDocsMap = topDocsDetails.reduce((acc: any, d) => {
    acc[d.id] = d.title;
    return acc;
  }, {});

  const topDownloadedDocs = downloads.map((d) => ({
    name: topDocsMap[d.documentId as string] || "Unknown",
    downloads: d._count.id,
  }));

  // 4. Usage Overview (Upload vs View vs Download)
  const actionStatsRaw = await prisma.auditLog.groupBy({
    by: ["action"],
    _count: { id: true },
  });

  const actionStats = actionStatsRaw.map((stat) => ({
    name: stat.action,
    count: stat._count.id,
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            สถิติและรายงาน (Analytics)
          </h1>
          <p className="text-slate-500 dark:text-white mt-1">
            ภาพรวมการใช้งานระบบจัดการเอกสารทั้งหมด
          </p>
        </div>
      </div>

      <AnalyticsDashboard
        totalStorageMB={totalStorageMB}
        departmentStats={departmentStats}
        topDownloadedDocs={topDownloadedDocs}
        actionStats={actionStats}
        totalDocuments={documents.length}
      />
    </div>
  );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { FileText, Users, Activity, Clock, Star, Database } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import DashboardCharts from "@/components/DashboardCharts";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // ดึงสถิติต่างๆ ในแผนก
  const whereClause: any =
    session.user.role === "SUPER_ADMIN"
      ? {}
      : { departmentId: session.user.departmentId as string };

  const totalDocuments = await prisma.document.count({
    where: whereClause,
  });

  const totalUsers = await prisma.user.count({
    where: whereClause,
  });

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const docsThisWeek = await prisma.document.count({
    where: {
      ...whereClause,
      createdAt: { gte: oneWeekAgo },
    },
  });

  const storageResult = await prisma.document.aggregate({
    _sum: { fileSize: true },
    where: whereClause,
  });
  const totalStorageMB = ((storageResult._sum.fileSize || 0) / (1024 * 1024)).toFixed(1);

  const topDownloaded = await prisma.auditLog.groupBy({
    by: ['documentId'],
    _count: { id: true },
    where: { action: 'DOWNLOAD', documentId: { not: null } },
    orderBy: { _count: { id: 'desc' } },
    take: 5,
  });
  
  const topDownloadedDocs = await Promise.all(
    topDownloaded.map(async (t) => {
      const doc = await prisma.document.findUnique({
        where: { id: t.documentId! },
        select: { title: true, documentType: true, createdAt: true }
      });
      return { ...t, doc };
    })
  ).then(res => res.filter(r => r.doc));

  const topDepartments = await prisma.document.groupBy({
    by: ['departmentId'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 5,
  });

  const topDepartmentsData = await Promise.all(
    topDepartments.map(async (t) => {
      if (!t.departmentId) return null;
      const dept = await prisma.department.findUnique({
        where: { id: t.departmentId },
        select: { name: true }
      });
      return { ...t, dept };
    })
  ).then(res => res.filter(r => r && r.dept) as any[]);

  const recentDocuments = await prisma.document.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { uploader: { select: { name: true } } },
  });

  const starredDocuments = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    include: {
      document: {
        include: { uploader: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const activityWhereClause: any =
    session.user.role === "SUPER_ADMIN"
      ? {}
      : { document: { departmentId: session.user.departmentId as string } };

  const recentActivity = await prisma.auditLog.findMany({
    where: activityWhereClause,
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      user: { select: { name: true } },
      document: { select: { title: true } },
    },
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* 1. Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">
            ยินดีต้อนรับกลับมา, {session.user.name}
          </h1>
          <p className="text-blue-100 max-w-xl">
            {session.user.role === "SUPER_ADMIN"
              ? 'นี่คือภาพรวมระบบจัดการเอกสารของ "ทุกแผนก" ประจำวันนี้'
              : `นี่คือภาพรวมระบบจัดการเอกสารของ ${session.user.departmentName || "แผนกของคุณ"} ประจำวันนี้`}
          </p>
          {session.user.role === "SUPER_ADMIN" && (
            <div className="mt-6">
              <Link
                href="/analytics"
                className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-5 py-2.5 rounded-xl font-medium border border-white/20 backdrop-blur-sm shadow-sm transition-colors"
              >
                <Activity size={18} />
                ดูรายงานสถิติเชิงลึก (Analytics)
              </Link>
            </div>
          )}
        </div>
        {/* Decor */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-white dark:bg-slate-900 transition-colors opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl p-6 border border-slate-200 dark:border-slate-600 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-white">
              เอกสารทั้งหมด
            </p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">
              {totalDocuments}{" "}
              <span className="text-sm font-medium text-slate-400 dark:text-white">
                ไฟล์
              </span>
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl p-6 border border-slate-200 dark:border-slate-600 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-white">
              อัปโหลดสัปดาห์นี้
            </p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">
              {docsThisWeek}{" "}
              <span className="text-sm font-medium text-slate-400 dark:text-white">
                ไฟล์
              </span>
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl p-6 border border-slate-200 dark:border-slate-600 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-white">
              บุคลากรในแผนก
            </p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">
              {totalUsers}{" "}
              <span className="text-sm font-medium text-slate-400 dark:text-white">
                คน
              </span>
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl p-6 border border-slate-200 dark:border-slate-600 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-500/20 text-purple-600 flex items-center justify-center shrink-0">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-white">
              พื้นที่จัดเก็บ
            </p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">
              {totalStorageMB}{" "}
              <span className="text-sm font-medium text-slate-400 dark:text-white">
                MB
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Starred Documents Widget */}
      {starredDocuments.length > 0 && (
        <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl border border-slate-200 dark:border-slate-600 shadow-sm overflow-hidden mb-8">
          <div className="p-6 border-b border-slate-100 dark:border-slate-600 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Star size={20} className="text-yellow-400" fill="currentColor" />
              เอกสารที่ติดดาว (ใช้บ่อย)
            </h3>
            <Link
              href="/documents"
              className="text-sm font-medium text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-300"
            >
              ไปที่คลังเอกสาร
            </Link>
          </div>
          <div className="p-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {starredDocuments.map((fav) => (
              <div
                key={fav.id}
                className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors rounded-xl border border-transparent hover:border-slate-100 dark:border-slate-600 dark:hover:border-slate-700"
              >
                <div className="w-10 h-10 rounded-lg bg-yellow-50 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-300 flex items-center justify-center shrink-0">
                  <FileText size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-white truncate">
                    {fav.document.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-white truncate">
                    {fav.document.documentType || "ทั่วไป"} •{" "}
                    {format(new Date(fav.document.createdAt), "dd MMM yyyy")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 3. Recent Documents */}
        <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl border border-slate-200 dark:border-slate-600 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-600 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              เอกสารล่าสุด
            </h3>
            <Link
              href="/documents"
              className="text-sm font-medium text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-300"
            >
              ดูทั้งหมด
            </Link>
          </div>
          <div className="p-2">
            {recentDocuments.length > 0 ? (
              recentDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors rounded-xl"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/20 text-blue-500 dark:text-blue-300 flex items-center justify-center shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-white truncate">
                      {doc.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-white truncate">
                      อัปโหลดโดย {doc.uploader.name}
                    </p>
                  </div>
                  <div className="text-xs font-medium text-slate-400 dark:text-white whitespace-nowrap">
                    {format(new Date(doc.createdAt), "dd MMM yyyy")}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500 dark:text-white text-sm">
                ยังไม่มีเอกสารในระบบ
              </div>
            )}
          </div>
        </div>

        {/* 4. Activity Logs */}
        <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl border border-slate-200 dark:border-slate-600 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-600">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              ประวัติการใช้งานล่าสุด
            </h3>
          </div>
          <div className="p-6 space-y-6">
            {recentActivity.length > 0 ? (
              recentActivity.map((log) => (
                <div key={log.id} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Activity
                      size={14}
                      className="text-slate-500 dark:text-white"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-slate-700 dark:text-white">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {log.user?.name}
                      </span>{" "}
                      ได้ทำการ
                      <span className="font-semibold text-blue-600 dark:text-blue-300 mx-1">
                        {log.action}
                      </span>
                      เอกสาร{" "}
                      <span className="font-medium text-slate-900 dark:text-white">
                        {log.document?.title || "Unknown"}
                      </span>
                    </p>
                    <p className="text-xs text-slate-400 dark:text-white mt-1">
                      {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-500 dark:text-white text-sm">
                ยังไม่มีประวัติการใช้งาน
              </div>
            )}
                    </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl border border-slate-200 dark:border-slate-600 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-600">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">เอกสารที่มีการดาวน์โหลดสูงสุด</h3>
          </div>
          <div className="p-2">
            {topDownloadedDocs.length > 0 ? (
              topDownloadedDocs.map((item, idx) => (
                <div key={item.documentId} className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-white truncate">{item.doc?.title}</p>
                    <p className="text-xs text-slate-500 dark:text-white truncate">{item.doc?.documentType || "ไม่ระบุ"}</p>
                  </div>
                  <div className="text-sm font-bold text-blue-600 dark:text-blue-400">{item._count.id} ครั้ง</div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500 dark:text-white text-sm">ยังไม่มีข้อมูลการดาวน์โหลด</div>
            )}
          </div>
        </div>

        {session.user.role === "SUPER_ADMIN" && (
          <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl border border-slate-200 dark:border-slate-600 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-600">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">กราฟสถิติการอัปโหลดแยกตามแผนก</h3>
            </div>
            <div className="p-6">
              {topDepartmentsData.length > 0 ? (
                <DashboardCharts topDepartmentsData={topDepartmentsData} />
              ) : (
                <div className="p-8 text-center text-slate-500 dark:text-white text-sm">ยังไม่มีข้อมูล</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

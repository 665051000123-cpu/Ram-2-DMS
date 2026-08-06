import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { FileText, Users, Activity, Clock, Star } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  // ดึงสถิติต่างๆ ในแผนก
  const whereClause: any = session.user.role === 'SUPER_ADMIN' ? {} : { departmentId: session.user.departmentId as string };

  const totalDocuments = await prisma.document.count({
    where: whereClause
  });

  const totalUsers = await prisma.user.count({
    where: whereClause
  });

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const docsThisWeek = await prisma.document.count({
    where: { 
      ...whereClause,
      createdAt: { gte: oneWeekAgo }
    }
  });

  const recentDocuments = await prisma.document.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { uploader: { select: { name: true } } }
  });

  const starredDocuments = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    include: {
      document: {
        include: { uploader: { select: { name: true } } }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  const activityWhereClause: any = session.user.role === 'SUPER_ADMIN' ? {} : { document: { departmentId: session.user.departmentId as string } };

  const recentActivity = await prisma.auditLog.findMany({
    where: activityWhereClause,
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      user: { select: { name: true } },
      document: { select: { title: true } }
    }
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* 1. Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">ยินดีต้อนรับกลับมา, {session.user.name}</h1>
          <p className="text-blue-100 max-w-xl">
            {session.user.role === 'SUPER_ADMIN' 
              ? 'นี่คือภาพรวมระบบจัดการเอกสารของ "ทุกแผนก" ประจำวันนี้' 
              : `นี่คือภาพรวมระบบจัดการเอกสารของ ${session.user.departmentName || 'แผนกของคุณ'} ประจำวันนี้`}
          </p>
          {session.user.role === 'SUPER_ADMIN' && (
            <div className="mt-6">
              <Link href="/analytics" className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-5 py-2.5 rounded-xl font-medium transition-colors border border-white/20 backdrop-blur-sm shadow-sm">
                <Activity size={18} />
                ดูรายงานสถิติเชิงลึก (Analytics)
              </Link>
            </div>
          )}
        </div>
        {/* Decor */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">เอกสารทั้งหมด</p>
            <p className="text-2xl font-bold text-slate-800">{totalDocuments} <span className="text-sm font-medium text-slate-400">ไฟล์</span></p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">อัปโหลดสัปดาห์นี้</p>
            <p className="text-2xl font-bold text-slate-800">{docsThisWeek} <span className="text-sm font-medium text-slate-400">ไฟล์</span></p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">บุคลากรในแผนก</p>
            <p className="text-2xl font-bold text-slate-800">{totalUsers} <span className="text-sm font-medium text-slate-400">คน</span></p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">พื้นที่จัดเก็บ</p>
            <p className="text-2xl font-bold text-slate-800">{(totalDocuments * 1.2).toFixed(1)} <span className="text-sm font-medium text-slate-400">MB</span></p>
          </div>
        </div>
      </div>

      {/* Starred Documents Widget */}
      {starredDocuments.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Star size={20} className="text-yellow-400" fill="currentColor" />
              เอกสารที่ติดดาว (ใช้บ่อย)
            </h3>
            <Link href="/documents" className="text-sm font-medium text-blue-600 hover:text-blue-700">ไปที่คลังเอกสาร</Link>
          </div>
          <div className="p-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {starredDocuments.map((fav) => (
              <div key={fav.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
                <div className="w-10 h-10 rounded-lg bg-yellow-50 text-yellow-600 flex items-center justify-center shrink-0">
                  <FileText size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{fav.document.title}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {fav.document.documentType || 'ทั่วไป'} • {format(new Date(fav.document.createdAt), 'dd MMM yyyy')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 3. Recent Documents */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">เอกสารล่าสุด</h3>
            <Link href="/documents" className="text-sm font-medium text-blue-600 hover:text-blue-700">ดูทั้งหมด</Link>
          </div>
          <div className="p-2">
            {recentDocuments.length > 0 ? (
              recentDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-xl transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{doc.title}</p>
                    <p className="text-xs text-slate-500 truncate">อัปโหลดโดย {doc.uploader.name}</p>
                  </div>
                  <div className="text-xs font-medium text-slate-400 whitespace-nowrap">
                    {format(new Date(doc.createdAt), 'dd MMM yyyy')}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500 text-sm">ยังไม่มีเอกสารในระบบ</div>
            )}
          </div>
        </div>

        {/* 4. Activity Logs */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-800">ประวัติการใช้งานล่าสุด</h3>
          </div>
          <div className="p-6 space-y-6">
            {recentActivity.length > 0 ? (
              recentActivity.map((log) => (
                <div key={log.id} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                    <Activity size={14} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold text-slate-900">{log.user?.name}</span> ได้ทำการ 
                      <span className="font-semibold text-blue-600 mx-1">{log.action}</span> 
                      เอกสาร <span className="font-medium text-slate-900">{log.document?.title || 'Unknown'}</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-500 text-sm">ยังไม่มีประวัติการใช้งาน</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

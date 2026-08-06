import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import DepartmentSettings from '@/components/DepartmentSettings';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role !== 'SUPER_ADMIN') {
    return (
      <div className="p-6 text-center mt-20">
        <h1 className="text-2xl font-bold text-red-600">ปฏิเสธการเข้าถึง</h1>
        <p className="text-slate-500 mt-2">คุณไม่มีสิทธิ์เข้าถึงหน้านี้ เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้น</p>
      </div>
    );
  }

  // Fetch departments along with user and document counts
  const departments = await prisma.department.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { users: true, documents: true }
      }
    }
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">ตั้งค่าระบบ</h1>
        <p className="text-slate-500 mt-1">
          จัดการแผนกและโครงสร้างพื้นฐานของโรงพยาบาล
        </p>
      </div>

      <DepartmentSettings initialDepartments={departments} />
    </div>
  );
}

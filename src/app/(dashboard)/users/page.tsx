import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import UserList from '@/components/UserList';

export default async function UsersPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  // อนุญาตแค่ Admin หรือ Department Head เข้าหน้านี้
  if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'DEPARTMENT_HEAD') {
    return (
      <div className="p-6 text-center mt-20">
        <h1 className="text-2xl font-bold text-red-600">ปฏิเสธการเข้าถึง</h1>
        <p className="text-slate-500 mt-2">คุณไม่มีสิทธิ์เข้าถึงหน้านี้ เฉพาะหัวหน้าแผนก หรือผู้ดูแลระบบเท่านั้น</p>
      </div>
    );
  }

  // ถ้าเป็น SUPER_ADMIN ให้ดึงทั้งหมด ถ้าเป็น DEPARTMENT_HEAD ให้ดึงเฉพาะแผนกตัวเอง
  const whereClause = session.user.role === 'SUPER_ADMIN' ? {} : { departmentId: session.user.departmentId };

  const usersRaw = await prisma.user.findMany({
    where: whereClause,
    include: {
      department: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const users = usersRaw.map(u => ({
    ...u,
    role: u.role === 'DEPT_HEAD' ? 'DEPARTMENT_HEAD' : u.role
  }));

  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' }
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">จัดการผู้ใช้งานในระบบ</h1>
        <p className="text-slate-500 mt-1">
          เพิ่ม ลบ และจัดการสิทธิ์การเข้าถึงระบบของบุคลากร
        </p>
      </div>

      <UserList 
        initialUsers={users as any} 
        currentUserRole={session.user.role} 
        currentUserId={session.user.id} 
        departments={departments}
        currentUserDepartmentId={session.user.departmentId}
      />
    </div>
  );
}

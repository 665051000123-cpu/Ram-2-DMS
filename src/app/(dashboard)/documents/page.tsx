import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import DocumentList from '@/components/DocumentList';

export default async function DocumentsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  let whereClause: any = { isDeleted: false };
  if (session.user.role !== 'SUPER_ADMIN') {
    whereClause = {
      AND: [
        { isDeleted: false },
        {
          OR: [
            { visibility: 'PUBLIC' },
            { visibility: 'DEPARTMENT', departmentId: session.user.departmentId },
            { visibility: 'PRIVATE', uploaderId: session.user.id },
            { visibility: 'PRIVATE', accessList: { some: { userId: session.user.id } } }
          ]
        }
      ]
    };
  }
  const documents = await prisma.document.findMany({
    where: whereClause,
    include: {
      uploader: { select: { name: true } },
      department: { select: { name: true, id: true } },
      favoritedBy: { where: { userId: session.user.id } },
      versions: { orderBy: { version: 'desc' } }
    },
    orderBy: { createdAt: 'desc' }
  });

  let departments: { id: string, name: string }[] = [];
  if (session.user.role === 'SUPER_ADMIN') {
    departments = await prisma.department.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">คลังเอกสาร</h1>
        <p className="text-slate-500 mt-1">
          เอกสารทั้งหมดในแผนกของคุณ ค้นหาและดาวน์โหลดเอกสารที่ต้องการ
        </p>
      </div>

      <DocumentList 
        initialDocuments={documents as any} 
        currentUserId={session.user.id}
        currentUserRole={session.user.role}
        departments={departments}
      />
    </div>
  );
}

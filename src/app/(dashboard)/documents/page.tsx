export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DocumentList from "@/components/DocumentList";

export default async function DocumentsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // Fetch folders the user has access to
  let accessibleFolders;
  if (session.user.role === "SUPER_ADMIN") {
    accessibleFolders = await prisma.folder.findMany({
      orderBy: { name: "asc" }
    });
  } else {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { departmentId: true, id: true, role: true }
    });
    accessibleFolders = await prisma.folder.findMany({
      where: {
        OR: [
          { departmentId: user?.departmentId },
          { departmentId: null },
          ...(user?.departmentId ? [{ accessList: { some: { departmentId: user.departmentId } } }] : []),
          { accessList: { some: { userId: user?.id } } },
          { accessList: { some: { role: user?.role } } }
        ]
      },
      orderBy: { name: "asc" }
    });
  }

  let whereClause: any = {
    isDeleted: false,
  };

  if (session.user.role !== "SUPER_ADMIN") {
    const userDeptId = session.user.departmentId;
    whereClause.OR = [
      { uploaderId: session.user.id },
      { departmentId: userDeptId },
      { visibility: "PUBLIC" },
      { 
        visibility: "CUSTOM", 
        sharedDepartments: { some: { id: userDeptId } } 
      }
    ];
  }

  const documents = await prisma.document.findMany({
    where: whereClause,
    include: {
      uploader: { select: { name: true } },
      folder: { select: { name: true, id: true } },
      department: { select: { name: true, id: true } },
      documentTypeRef: true,
      favoritedBy: { where: { userId: session.user.id } },
      versions: { orderBy: { version: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  let departments = await prisma.department.findMany({
    orderBy: { name: "asc" }
  });

  if (session.user.role !== "SUPER_ADMIN") {
    const accessibleDeptIds = new Set<string>();
    if (session.user.departmentId) {
      accessibleDeptIds.add(session.user.departmentId);
    }
    documents.forEach((doc: any) => {
      if (doc.departmentId) {
        accessibleDeptIds.add(doc.departmentId);
      }
    });
    
    // Filter departments to only those the user has access to
    departments = departments.filter(dept => accessibleDeptIds.has(dept.id));
  }

  const documentTypes = await prisma.documentType.findMany({
    orderBy: { name: "asc" }
  });

  return (
    <div className="p-6 w-full mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          คลังเอกสาร
        </h1>
        <p className="text-slate-500 dark:text-white mt-1">
          เอกสารทั้งหมดในโฟลเดอร์ที่คุณมีสิทธิ์เข้าถึง ค้นหาและดาวน์โหลดเอกสารที่ต้องการ
        </p>
      </div>

      <DocumentList
        initialDocuments={documents as any}
        currentUserId={session.user.id}
        currentUserRole={session.user.role}
        currentUserDepartmentId={session.user.departmentId}
        departments={departments}
        documentTypes={documentTypes}
      />
    </div>
  );
}

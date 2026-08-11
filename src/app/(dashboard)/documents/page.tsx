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

  const folderIds = accessibleFolders.map(f => f.id);

  const whereClause: any = {
    isDeleted: false,
    OR: [
      { folderId: { in: folderIds } },
      { uploaderId: session.user.id } // Always see own docs
    ]
  };

  const documents = await prisma.document.findMany({
    where: whereClause,
    include: {
      uploader: { select: { name: true } },
      folder: { select: { name: true, id: true } },
      department: { select: { name: true, id: true } },
      favoritedBy: { where: { userId: session.user.id } },
      versions: { orderBy: { version: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" }
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
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
        folders={accessibleFolders}
        departments={departments}
      />
    </div>
  );
}

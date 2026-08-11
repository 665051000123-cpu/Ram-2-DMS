import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const type = searchParams.get("type");
    const departmentId = searchParams.get("departmentId");
    const folderId = searchParams.get("folderId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    let accessibleFolders;
    if (session.user.role === "SUPER_ADMIN") {
      accessibleFolders = await prisma.folder.findMany({ select: { id: true } });
    } else {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { departmentId: true }
      });
      accessibleFolders = await prisma.folder.findMany({
        where: {
          OR: [
            { departmentId: user?.departmentId },
            { departmentId: null }
          ]
        },
        select: { id: true }
      });
    }

    const folderIds = accessibleFolders.map(f => f.id);

    // Build the query
    let whereClause: any = {
      isDeleted: false,
      OR: [
        { folderId: { in: folderIds } },
        { uploaderId: session.user.id }
      ]
    };

    if (q) {
      // Use AND for text search to not override the access control OR
      whereClause = {
        AND: [
          whereClause,
          {
            OR: [
              { title: { contains: q } },
              { description: { contains: q } },
              { tags: { contains: q } },
              { extractedText: { contains: q } }
            ]
          }
        ]
      };
    }

    if (type && type !== "ALL") {
      whereClause.documentType = type;
    }

    if (departmentId && departmentId !== "ALL") {
      whereClause.departmentId = departmentId;
    }

    if (folderId && folderId !== "ALL") {
      whereClause.folderId = folderId;
    }

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = toDate;
      }
    }

    const documents = await prisma.document.findMany({
      where: whereClause,
      select: { id: true },
    });

    return NextResponse.json({ documentIds: documents.map((d) => d.id) });
  } catch (error) {
    console.error("Deep Search Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

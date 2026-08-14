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

    // Build the query
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
              { extractedText: { contains: q } },
              { customFields: { string_contains: q } }
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
      select: { 
        id: true,
        title: true,
        documentCode: true,
        documentType: true,
        department: { select: { id: true, name: true } }
      },
    });

    return NextResponse.json({ 
      documentIds: documents.map((d) => d.id),
      documents: documents
    });
  } catch (error) {
    console.error("Deep Search Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

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
    const q = searchParams.get("q");

    if (!q) {
      return NextResponse.json({ documentIds: [] });
    }

    // Role-based where clause
    let whereClause: any = {
      isDeleted: false,
      extractedText: {
        contains: q,
      },
    };

    if (session.user.role !== "SUPER_ADMIN") {
      whereClause = {
        AND: [
          whereClause,
          {
            OR: [
              { visibility: "PUBLIC" },
              {
                visibility: "DEPARTMENT",
                departmentId: session.user.departmentId,
              },
              { visibility: "PRIVATE", uploaderId: session.user.id },
              {
                visibility: "PRIVATE",
                accessList: { some: { userId: session.user.id } },
              },
            ],
          },
        ],
      };
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

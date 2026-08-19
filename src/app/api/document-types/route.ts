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


    let documentTypes = await prisma.documentType.findMany({
      include: { department: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' }
    });

    if (session.user.role !== "SUPER_ADMIN") {
      documentTypes = documentTypes.filter((doc: any) => {
        if (!doc.visibleTo) return true; // Default to global if not set (backwards compatible)
        const visibleTo = doc.visibleTo as string[];
        if (visibleTo.includes("GLOBAL")) return true;
        return session.user.departmentId ? visibleTo.includes(session.user.departmentId) : false;
      });
    }

    return NextResponse.json({ documentTypes });
  } catch (error) {
    console.error("Fetch DocumentTypes Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Only Dev can manage this." }, { status: 401 });
    }

    const { name, description, visibleTo, schema } = await req.json();

    if (!name || !schema || !visibleTo || visibleTo.length === 0) {
      return NextResponse.json({ error: "Missing required fields or visibility" }, { status: 400 });
    }

    const docType = await prisma.documentType.create({
      data: {
        name,
        description,
        departmentId: null, // Legacy, unused
        visibleTo: visibleTo,
        schema
      }
    });

    return NextResponse.json({ success: true, documentType: docType }, { status: 201 });
  } catch (error) {
    console.error("Create DocumentType Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const docId = resolvedParams.id;

    // We want to get documents where current doc is either source or target
    const linksAsSource = await prisma.documentLink.findMany({
      where: { sourceId: docId },
      include: {
        target: {
          select: { id: true, title: true, documentCode: true, documentType: true }
        }
      }
    });

    const linksAsTarget = await prisma.documentLink.findMany({
      where: { targetId: docId },
      include: {
        source: {
          select: { id: true, title: true, documentCode: true, documentType: true }
        }
      }
    });

    // Normalize into a single list of linked documents
    const linkedDocs = [
      ...linksAsSource.map(link => ({ linkId: link.id, document: link.target })),
      ...linksAsTarget.map(link => ({ linkId: link.id, document: link.source }))
    ];

    return NextResponse.json({ links: linkedDocs });
  } catch (error) {
    console.error("Fetch links error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const sourceId = resolvedParams.id;
    
    const { targetId } = await req.json();
    if (!targetId || targetId === sourceId) {
      return NextResponse.json({ error: "Invalid target document" }, { status: 400 });
    }

    // Ensure documents exist
    const [sourceDoc, targetDoc] = await Promise.all([
      prisma.document.findUnique({ where: { id: sourceId } }),
      prisma.document.findUnique({ where: { id: targetId } })
    ]);

    if (!sourceDoc || !targetDoc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Check if link already exists in either direction
    const existingLink = await prisma.documentLink.findFirst({
      where: {
        OR: [
          { sourceId, targetId },
          { sourceId: targetId, targetId: sourceId }
        ]
      }
    });

    if (existingLink) {
      return NextResponse.json({ error: "Documents are already linked" }, { status: 400 });
    }

    const newLink = await prisma.documentLink.create({
      data: {
        sourceId,
        targetId
      }
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        action: "EDIT",
        documentId: sourceId,
        userId: session.user.id,
        details: `Linked to document: ${targetDoc.title}`
      }
    });

    return NextResponse.json({ success: true, link: newLink }, { status: 201 });
  } catch (error) {
    console.error("Create link error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const sourceId = resolvedParams.id; // Not used directly for delete, but part of URL
    const url = new URL(req.url);
    const linkId = url.searchParams.get("linkId");

    if (!linkId) {
      return NextResponse.json({ error: "Link ID is required" }, { status: 400 });
    }

    const link = await prisma.documentLink.findUnique({ where: { id: linkId } });
    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    await prisma.documentLink.delete({ where: { id: linkId } });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        action: "EDIT",
        documentId: sourceId,
        userId: session.user.id,
        details: `Unlinked a document`
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete link error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

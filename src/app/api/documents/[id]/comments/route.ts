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
    const documentId = resolvedParams.id;

    const comments = await prisma.comment.findMany({
      where: { documentId },
      include: {
        user: { select: { name: true, role: true } }
      },
      orderBy: { createdAt: "asc" }
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Fetch comments error:", error);
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
    const documentId = resolvedParams.id;
    
    const { text } = await req.json();
    if (!text || text.trim() === "") {
      return NextResponse.json({ error: "Comment text cannot be empty" }, { status: 400 });
    }

    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const comment = await prisma.comment.create({
      data: {
        text: text.trim(),
        documentId,
        userId: session.user.id
      },
      include: {
        user: { select: { name: true, role: true } }
      }
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        action: "EDIT",
        documentId,
        userId: session.user.id,
        details: `Added a comment: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`
      }
    });

    return NextResponse.json({ success: true, comment }, { status: 201 });
  } catch (error) {
    console.error("Create comment error:", error);
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
    const documentId = resolvedParams.id;
    const url = new URL(req.url);
    const commentId = url.searchParams.get("commentId");

    if (!commentId) {
      return NextResponse.json({ error: "Comment ID is required" }, { status: 400 });
    }

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Only allow deletion if user is the author or is an admin
    if (comment.userId !== session.user.id && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden: You can only delete your own comments" }, { status: 403 });
    }

    await prisma.comment.delete({ where: { id: commentId } });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        action: "EDIT",
        documentId,
        userId: session.user.id,
        details: `Deleted a comment`
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete comment error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

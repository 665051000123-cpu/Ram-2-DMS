import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import bcrypt from "bcryptjs";

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
    const { password, expiresInDays } = await req.json();

    // Verify document access
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Only creator, manager, or super admin can share externally
    if (
      document.uploaderId !== session.user.id &&
      session.user.role !== "SUPER_ADMIN" &&
      session.user.role !== "DEPT_HEAD"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");

    // Hash password if provided
    let hashedPassword = null;
    if (password && password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    // Calculate expiry
    let expiresAt = null;
    if (expiresInDays && !isNaN(parseInt(expiresInDays))) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));
    }

    const externalShare = await prisma.externalShare.create({
      data: {
        documentId,
        token,
        password: hashedPassword,
        expiresAt,
        createdBy: session.user.id,
      },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        action: "EDIT",
        documentId: documentId,
        userId: session.user.id,
        details: "Created secure external share link",
      },
    });

    return NextResponse.json({
      success: true,
      share: {
        id: externalShare.id,
        token: externalShare.token,
        expiresAt: externalShare.expiresAt,
        hasPassword: !!externalShare.password,
      },
    });
  } catch (error) {
    console.error("External share creation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

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

    const shares = await prisma.externalShare.findMany({
      where: { documentId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        token: true,
        expiresAt: true,
        createdAt: true,
        viewCount: true,
        password: true, // We only check if it exists
      },
    });

    return NextResponse.json({
      shares: shares.map((s: any) => ({
        ...s,
        hasPassword: !!s.password,
        password: undefined, // Don't send the actual hash to frontend
      })),
    });
  } catch (error) {
    console.error("Fetch external shares error:", error);
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
    const shareId = url.searchParams.get("shareId");

    if (!shareId) {
      return NextResponse.json({ error: "Share ID is required" }, { status: 400 });
    }

    const share = await prisma.externalShare.findUnique({
      where: { id: shareId },
    });

    if (!share || share.documentId !== documentId) {
      return NextResponse.json({ error: "Share link not found" }, { status: 404 });
    }

    if (
      share.createdBy !== session.user.id &&
      session.user.role !== "SUPER_ADMIN" &&
      session.user.role !== "DEPT_HEAD"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.externalShare.delete({ where: { id: shareId } });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        action: "EDIT",
        documentId: documentId,
        userId: session.user.id,
        details: "Revoked external share link",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete external share error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

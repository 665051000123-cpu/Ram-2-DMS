import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const docId = resolvedParams.id;
    
    const url = new URL(req.url);
    const isView = url.searchParams.get('view') === 'true';

    // Find the document
    const document = await prisma.document.findUnique({
      where: { id: docId, isDeleted: false },
      include: { accessList: true }
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check permissions
    if (session.user.role !== 'SUPER_ADMIN') {
      if (document.visibility === 'PRIVATE') {
        const hasAccess = document.uploaderId === session.user.id || document.accessList.some((a: any) => a.userId === session.user.id);
        if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      } else if (document.visibility === 'DEPARTMENT') {
        if (document.departmentId !== session.user.departmentId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Create Audit Log for DOWNLOAD/VIEW
    await prisma.auditLog.create({
      data: {
        action: isView ? 'VIEW' : 'DOWNLOAD',
        documentId: document.id,
        userId: session.user.id,
        details: isView ? 'Viewed document' : 'Downloaded document'
      }
    });

    // Build base URL from headers to avoid 0.0.0.0 when hosted externally
    const host = req.headers.get('host') || 'localhost:5175';
    const protocol = req.headers.get('x-forwarded-proto') || (req.url.startsWith('https') ? 'https' : 'http');
    const baseUrl = `${protocol}://${host}`;
    
    return NextResponse.redirect(new URL(document.fileUrl, baseUrl));

  } catch (error) {
    console.error('Download/View Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

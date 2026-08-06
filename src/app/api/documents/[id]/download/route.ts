import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    // Find the document
    const document = await prisma.document.findUnique({
      where: { id: docId },
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

    // Create Audit Log for DOWNLOAD
    await prisma.auditLog.create({
      data: {
        action: 'DOWNLOAD',
        documentId: document.id,
        userId: session.user.id,
        details: 'Downloaded or viewed document'
      }
    });

    // Redirect to the actual static file URL
    return NextResponse.redirect(new URL(document.fileUrl, req.url));

  } catch (error) {
    console.error('Download/View Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'DEPARTMENT_HEAD')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const docId = resolvedParams.id;

    const document = await prisma.document.findUnique({
      where: { id: docId }
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Restore record in DB
    await prisma.document.update({
      where: { id: docId },
      data: { isDeleted: false, deletedAt: null }
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'EDIT',
        userId: session.user.id,
        documentId: document.id,
        details: `Restored document from Recycle Bin: ${document.title}`
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Restore Document Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

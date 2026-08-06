import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function DELETE(
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
      where: { id: docId },
      include: { versions: true }
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete all physical files (current + versions)
    const filesToDelete = [document.fileUrl, ...document.versions.map(v => v.fileUrl)];
    
    for (const url of filesToDelete) {
      if (url) {
        const filePath = path.join(process.cwd(), 'public', url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    // Create Audit Log before deleting document (or it might fail if cascading is off)
    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        userId: session.user.id,
        details: `Permanently deleted document: ${document.title} (ID: ${document.id})`
      }
    });

    // Hard delete from DB
    await prisma.document.delete({
      where: { id: docId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Hard Delete Document Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

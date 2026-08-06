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

    if (!session?.user) {
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

    // Check permissions: Only Uploader or Admin/Department Head can delete
    const isUploader = document.uploaderId === session.user.id;
    const isAdmin = session.user.role === 'SUPER_ADMIN' || session.user.role === 'DEPARTMENT_HEAD';

    if (!isUploader && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized to delete this document' }, { status: 403 });
    }

    // Delete file from disk
    if (document.fileUrl) {
      // fileUrl is something like '/uploads/HR/filename.pdf'
      // process.cwd() + 'public' + '/uploads/HR/filename.pdf'
      const filePath = path.join(process.cwd(), 'public', document.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Create Audit Log before deleting document (or it might fail if cascading is off)
    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        userId: session.user.id,
        documentId: document.id,
        details: `Deleted document: ${document.title}`
      }
    });

    // Delete record from DB
    await prisma.document.delete({
      where: { id: docId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Document Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const docId = resolvedParams.id;

    // We accept FormData now to support new file upload
    const formData = await req.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const tags = formData.get('tags') as string;
    const documentType = formData.get('documentType') as string;
    const visibility = formData.get('visibility') as string;
    const file = formData.get('file') as File | null;

    const document = await prisma.document.findUnique({
      where: { id: docId },
      include: { department: true }
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check permissions
    const isUploader = document.uploaderId === session.user.id;
    const isAdmin = session.user.role === 'SUPER_ADMIN' || session.user.role === 'DEPARTMENT_HEAD';

    if (!isUploader && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized to edit this document' }, { status: 403 });
    }

    let fileUrl = document.fileUrl;
    let fileType = document.fileType;
    let newVersionNumber = document.currentVersion;
    let hasNewFile = false;

    // Handle new file upload if provided
    if (file) {
      const { v4: uuidv4 } = require('uuid');
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const fileExtension = file.name.split('.').pop();
      const uniqueFilename = `${uuidv4()}.${fileExtension}`;
      
      const deptFolderName = document.department.name.replace(/[^a-zA-Z0-9-_\u0E00-\u0E7F]/g, '_');
      
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', deptFolderName);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const filePath = path.join(uploadDir, uniqueFilename);
      fs.writeFileSync(filePath, buffer);

      fileUrl = `/uploads/${deptFolderName}/${uniqueFilename}`;
      fileType = file.type;
      newVersionNumber += 1;
      hasNewFile = true;
    }

    const updateData: any = {
      title: title || document.title,
      description: description !== null ? description : document.description,
      tags: tags !== null ? tags : document.tags,
      documentType: documentType !== null ? documentType : document.documentType,
    };

    if (visibility) {
      updateData.visibility = visibility;
    }

    if (hasNewFile) {
      updateData.fileUrl = fileUrl;
      updateData.fileType = fileType;
      updateData.currentVersion = newVersionNumber;
      updateData.versions = {
        create: {
          version: newVersionNumber,
          fileUrl,
          fileType,
          uploaderId: session.user.id,
        }
      };
    }

    // Update document
    const updatedDoc = await prisma.document.update({
      where: { id: docId },
      data: updateData
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'EDIT',
        userId: session.user.id,
        documentId: document.id,
        details: hasNewFile ? `Edited document and uploaded V${newVersionNumber}: ${title}` : `Edited document details: ${title}`
      }
    });

    return NextResponse.json({ success: true, document: updatedDoc });
  } catch (error) {
    console.error('Update Document Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { getUploadDir } from "@/lib/storage";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const docId = resolvedParams.id;

    const document = await prisma.document.findUnique({
      where: { id: docId },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    // Check permissions: Only Uploader or Admin/Department Head can delete
    const isUploader = document.uploaderId === session.user.id;
    const isAdmin =
      session.user.role === "SUPER_ADMIN" ||
      session.user.role === "DEPARTMENT_HEAD";

    if (!isUploader && !isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized to delete this document" },
        { status: 403 },
      );
    }

    // Soft Delete: Do not remove file from disk yet.
    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        action: "DELETE",
        userId: session.user.id,
        documentId: document.id,
        details: `Soft-deleted document: ${document.title}`,
      },
    });

    // Update record in DB
    await prisma.document.update({
      where: { id: docId },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Document Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const docId = resolvedParams.id;

    // We accept FormData now to support new file upload
    const formData = await req.formData();
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const tags = formData.get("tags") as string;
    const documentType = formData.get("documentType") as string;
    const visibility = formData.get("visibility") as string;
    const file = formData.get("file") as File | null;

    const document = await prisma.document.findUnique({
      where: { id: docId },
      include: { department: true },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    // Check permissions
    const isUploader = document.uploaderId === session.user.id;
    const isAdmin =
      session.user.role === "SUPER_ADMIN" ||
      session.user.role === "DEPARTMENT_HEAD";

    if (!isUploader && !isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized to edit this document" },
        { status: 403 },
      );
    }

    let fileUrl = document.fileUrl;
    let fileType = document.fileType;
    let fileSize = document.fileSize;
    let newVersionNumber = document.currentVersion;
    let hasNewFile = false;

    // Handle new file upload if provided
    if (file) {
      const { v4: uuidv4 } = require("uuid");
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const fileExtension = file.name.split(".").pop();
      const uniqueFilename = `${uuidv4()}.${fileExtension}`;

      const deptFolderName =
        document.department?.name.replace(
          /[^a-zA-Z0-9-_\u0E00-\u0E7F]/g,
          "_",
        ) || "General";
      const baseUploadDir = await getUploadDir();
      const uploadDir = path.join(baseUploadDir, deptFolderName);

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, uniqueFilename);
      fs.writeFileSync(filePath, buffer);

      fileUrl = `/uploads/${deptFolderName}/${uniqueFilename}`;
      fileType = file.type;
      fileSize = buffer.length;
      newVersionNumber += 1;
      hasNewFile = true;
    }

    const updateData: any = {
      title: title || document.title,
      description: description !== null ? description : document.description,
      tags: tags !== null ? tags : document.tags,
      documentType:
        documentType !== null ? documentType : document.documentType,
    };

    if (visibility) {
      updateData.visibility = visibility;
    }

    if (hasNewFile) {
      updateData.fileUrl = fileUrl;
      updateData.fileType = fileType;
      updateData.fileSize = fileSize;
      updateData.currentVersion = newVersionNumber;
      updateData.versions = {
        create: {
          version: newVersionNumber,
          fileUrl,
          fileType,
          fileSize,
          uploaderId: session.user.id,
        },
      };
    }

    // Update document
    const updatedDoc = await prisma.document.update({
      where: { id: docId },
      data: updateData,
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        action: "EDIT",
        userId: session.user.id,
        documentId: document.id,
        details: hasNewFile
          ? `Edited document and uploaded V${newVersionNumber}: ${title}`
          : `Edited document details: ${title}`,
      },
    });

    if (hasNewFile && file) {
      (async () => {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          let extractedText = "";

          if (file.type === "application/pdf") {
            const pdfParse = require("pdf-parse");
            const data = await pdfParse(buffer);
            extractedText = data.text;
          } else if (file.type.startsWith("image/")) {
            const { createWorker } = require("tesseract.js");
            const worker = await createWorker("tha+eng");
            const {
              data: { text },
            } = await worker.recognize(buffer);
            extractedText = text;
            await worker.terminate();
          }

          if (extractedText && extractedText.trim().length > 0) {
            await prisma.document.update({
              where: { id: docId },
              data: { extractedText },
            });

            const latestVersion = await prisma.documentVersion.findFirst({
              where: { documentId: docId },
              orderBy: { version: "desc" },
            });

            if (latestVersion) {
              await prisma.documentVersion.update({
                where: { id: latestVersion.id },
                data: { extractedText },
              });
            }
          }
        } catch (ocrError) {
          console.error("OCR/Extraction Background Error:", ocrError);
        }
      })();
    }

    return NextResponse.json({ success: true, document: updatedDoc });
  } catch (error) {
    console.error("Update Document Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

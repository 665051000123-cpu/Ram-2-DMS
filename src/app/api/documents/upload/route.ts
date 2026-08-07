import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { getUploadDir } from "@/lib/storage";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !session.user ||
      !session.user.id ||
      !session.user.departmentId
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch department to get its name for the folder
    const department = await prisma.department.findUnique({
      where: { id: session.user.departmentId },
    });

    if (!department) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const tags = formData.get("tags") as string;
    const documentType = formData.get("documentType") as string;
    const visibility = (formData.get("visibility") as string) || "DEPARTMENT";
    const sharedUsers = formData.get("sharedUsers") as string; // JSON array of user IDs

    if (!file || !title) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create unique filename
    const fileExtension = file.name.split(".").pop();
    const uniqueFilename = `${uuidv4()}.${fileExtension}`;

    // Create Department Folder Name (Sanitized)
    const deptFolderName = department.name.replace(
      /[^a-zA-Z0-9-_\u0E00-\u0E7F]/g,
      "_",
    );

    // Save to UPLOAD_DIR
    const baseUploadDir = await getUploadDir();
    const uploadDir = path.join(baseUploadDir, deptFolderName);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, uniqueFilename);
    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/uploads/${deptFolderName}/${uniqueFilename}`;

    // Parse shared users if private
    let accessListData: any[] = [];
    if (visibility === "PRIVATE" && sharedUsers) {
      try {
        const userIds = JSON.parse(sharedUsers);
        if (Array.isArray(userIds)) {
          accessListData = userIds.map((uid: string) => ({ userId: uid }));
        }
      } catch (e) {
        console.error("Failed to parse sharedUsers", e);
      }
    }

    // Save to Database
    const newDocument = await prisma.document.create({
      data: {
        title,
        description: description || null,
        fileUrl,
        fileType: file.type,
        fileSize: buffer.length,
        tags: tags || "",
        documentType: documentType || null,
        currentVersion: 1,
        departmentId: session.user.departmentId,
        uploaderId: session.user.id,
        visibility: visibility as any,
        versions: {
          create: {
            version: 1,
            fileUrl,
            fileType: file.type,
            fileSize: buffer.length,
            uploaderId: session.user.id,
          },
        },
        accessList:
          accessListData.length > 0
            ? {
                create: accessListData,
              }
            : undefined,
      },
    });

    // Track UPLOAD action
    await prisma.auditLog.create({
      data: {
        action: "UPLOAD",
        documentId: newDocument.id,
        userId: session.user.id,
        details: `Uploaded file: ${uniqueFilename}`,
      },
    });

    // --- Notifications Logic ---
    // 1. Notify department members
    if (visibility === "DEPARTMENT" || visibility === "PUBLIC") {
      const deptUsers = await prisma.user.findMany({
        where: {
          departmentId: session.user.departmentId,
          notifyOnUpload: true,
          id: { not: session.user.id },
        },
      });
      if (deptUsers.length > 0) {
        await prisma.notification.createMany({
          data: deptUsers.map((u) => ({
            userId: u.id,
            title: "เอกสารใหม่ในแผนก",
            message: `${session.user.name} อัปโหลดเอกสารใหม่: "${title}"`,
            link: "/documents",
          })),
        });
      }
    }

    // 2. Notify shared users
    if (visibility === "PRIVATE" && accessListData.length > 0) {
      const sharedUsersToNotify = await prisma.user.findMany({
        where: {
          id: { in: accessListData.map((a) => a.userId) },
          notifyOnShare: true,
        },
      });
      if (sharedUsersToNotify.length > 0) {
        await prisma.notification.createMany({
          data: sharedUsersToNotify.map((u) => ({
            userId: u.id,
            title: "มีเอกสารแชร์ถึงคุณ",
            message: `${session.user.name} ได้แชร์เอกสารส่วนตัว: "${title}" ให้คุณ`,
            link: "/documents",
          })),
        });
      }
    }

    // --- Background OCR / Text Extraction ---
    (async () => {
      try {
        let extractedText = "";
        if (file.type === "application/pdf") {
          const pdfParse = require("pdf-parse");
          const data = await pdfParse(buffer);
          extractedText = data.text;
        } else if (file.type.startsWith("image/")) {
          const { createWorker } = require("tesseract.js");
          // tesseract.js v5 createWorker usage:
          const worker = await createWorker("tha+eng");
          const {
            data: { text },
          } = await worker.recognize(buffer);
          extractedText = text;
          await worker.terminate();
        }

        if (extractedText && extractedText.trim().length > 0) {
          await prisma.document.update({
            where: { id: newDocument.id },
            data: { extractedText },
          });

          const latestVersion = await prisma.documentVersion.findFirst({
            where: { documentId: newDocument.id },
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

    return NextResponse.json(
      { success: true, document: newDocument },
      { status: 201 },
    );
  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

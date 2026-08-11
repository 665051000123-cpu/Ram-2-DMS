import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { getUploadDir, uploadFileToStorage } from "@/lib/storage";
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
    const folderId = formData.get("folderId") as string;
    const sharedUsers = formData.get("sharedUsers") as string; // JSON array of user IDs
    let documentCode = formData.get("documentCode") as string;
    const retentionPeriodStr = formData.get("retentionPeriod") as string;
    const scannedFilePath = formData.get("scannedFilePath") as string | null;

    if (!file || !title) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Feature Toggles Check
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: ["STRICT_FILE_VALIDATION", "ENABLE_AUTO_OCR"] } }
    });
    const settingsMap = settings.reduce((acc: any, s) => { acc[s.key] = s.value === "true"; return acc; }, {});
    const isStrictValidation = settingsMap["STRICT_FILE_VALIDATION"] || false;
    const isAutoOcr = settingsMap["ENABLE_AUTO_OCR"] || false;

    // Strict File Validation (Magic Bytes)
    if (isStrictValidation) {
      const headerHex = buffer.toString('hex', 0, 4).toUpperCase();
      let isValid = false;
      
      // Basic magic bytes mapping
      if (file.type === 'application/pdf' && headerHex === '25504446') isValid = true;
      else if ((file.type === 'image/jpeg' || file.type === 'image/jpg') && headerHex.startsWith('FFD8FF')) isValid = true;
      else if (file.type === 'image/png' && headerHex === '89504E47') isValid = true;
      else if (file.type.includes('wordprocessingml') || file.type.includes('spreadsheetml') || file.type.includes('presentationml')) {
        // Office formats (ZIP based) start with 504B0304
        if (headerHex === '504B0304') isValid = true;
      } else {
        // If it's another type, we just pass it or we could strictly block. 
        // For DMS, let's pass other types if they are not claiming to be PDF/JPG/PNG/Office
        isValid = true;
      }

      if (!isValid) {
        return NextResponse.json({ error: "ไฟล์ไม่ถูกต้อง (นามสกุลไฟล์ไม่ตรงกับเนื้อหาไฟล์จริง)" }, { status: 400 });
      }
    }

    // Create unique filename
    const fileExtension = file.name.split(".").pop();
    const uniqueFilename = `${uuidv4()}.${fileExtension}`;

    // Create Department Folder Name (Sanitized)
    const deptFolderName = department.name.replace(
      /[^a-zA-Z0-9-_\u0E00-\u0E7F]/g,
      "_",
    );

    // Save to Local and Cloud Storage
    const { fileUrl, storagePath } = await uploadFileToStorage(
      buffer,
      uniqueFilename,
      deptFolderName,
      file.type
    );

    // Parse shared users
    let accessListData: any[] = [];
    if (sharedUsers) {
      try {
        const userIds = JSON.parse(sharedUsers);
        if (Array.isArray(userIds)) {
          accessListData = userIds.map((uid: string) => ({ userId: uid }));
        }
      } catch (e) {
        console.error("Failed to parse sharedUsers", e);
      }
    }

    // Auto-generate Document Code if not provided
    if (!documentCode) {
      const year = new Date().getFullYear();
      const currentYearDocs = await prisma.document.count({
        where: {
          departmentId: department.id,
          createdAt: {
            gte: new Date(`${year}-01-01T00:00:00.000Z`),
            lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
          }
        }
      });
      const runningNo = String(currentYearDocs + 1).padStart(3, '0');
      const deptCode = department.name.substring(0, 3).toUpperCase(); // fallback code
      documentCode = `${deptCode}-${year}-${runningNo}`;
    }

    let retentionPeriod = null;
    if (retentionPeriodStr) {
      retentionPeriod = new Date(retentionPeriodStr);
    }

    // Save to Database
    const newDocument = await prisma.document.create({
      data: {
        title,
        description: description || null,
        fileUrl,
        fileType: file.type,
        fileSize: buffer.length,
        storagePath: storagePath, // Save the physical location
        tags: tags || "",
        documentType: documentType || null,
        documentCode,
        retentionPeriod,
        currentVersion: 1,
        departmentId: session.user.departmentId,
        folderId,
        uploaderId: session.user.id,
        versions: {
          create: {
            version: 1,
            fileUrl,
            fileType: file.type,
            fileSize: buffer.length,
            storagePath: storagePath, // Save the physical location for this version
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

    // Record to AuditLog
    await prisma.auditLog.create({
      data: {
        action: "UPLOAD",
        documentId: newDocument.id,
        userId: session.user.id,
        details: `Uploaded document: ${newDocument.title}`,
      },
    });
    
    // Cleanup scanned file if applicable
    if (scannedFilePath) {
      try {
        let watchDir = path.join(process.cwd(), "scanned-docs");
        const setting = await prisma.systemSetting.findUnique({ where: { key: "SCANNER_DIR" } });
        if (setting && setting.value) {
          watchDir = setting.value;
        }

        const fullPath = path.join(watchDir, scannedFilePath);
        if (!scannedFilePath.includes("..") && !path.isAbsolute(scannedFilePath) && fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (err) {
        console.error("Failed to delete scanned file", err);
      }
    }

    // --- Notifications Logic ---
    // If not shared explicitly, we assume it's departmental by default (everyone in department can view)
    // Actually, document is tied to departmentId, so anyone in the department can view it.
    // Shared users just grant access to people outside the department.
    
    // Add Notification logic
    const departmentUsers = await prisma.user.findMany({
      where: {
        departmentId: session.user.departmentId,
        id: { not: session.user.id },
        notifyOnUpload: true,
      },
    });

    if (departmentUsers.length > 0) {
      await prisma.notification.createMany({
        data: departmentUsers.map((u) => ({
          userId: u.id,
          title: "เอกสารใหม่ในแผนก",
          message: `${session.user.name} อัปโหลดเอกสารใหม่: "${title}"`,
          link: "/documents",
        })),
      });
    }

    // Shared user notifications
    if (accessListData.length > 0) {
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
    if (isAutoOcr) {
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
    }

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

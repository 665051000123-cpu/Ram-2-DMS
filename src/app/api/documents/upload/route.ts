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
    const documentTypeId = formData.get("documentTypeId") as string;
    const customFieldsRaw = formData.get("customFields") as string;
    const folderId = formData.get("folderId") as string;
    const sharedUsers = formData.get("sharedUsers") as string; // JSON array of user IDs
    
    const visibilityRaw = formData.get("visibility") as string;
    const visibility = ["PRIVATE", "PUBLIC", "CUSTOM"].includes(visibilityRaw) ? visibilityRaw : "PRIVATE";
    
    const sharedDepartmentsRaw = formData.get("sharedDepartments") as string;
    let sharedDepartmentsList: string[] = [];
    if (visibility === "CUSTOM" && sharedDepartmentsRaw) {
      try {
        sharedDepartmentsList = JSON.parse(sharedDepartmentsRaw);
      } catch (e) {}
    }
    
    let documentCode = formData.get("documentCode") as string;
    const retentionPeriodStr = formData.get("retentionPeriod") as string;
    const scannedFilePath = formData.get("scannedFilePath") as string | null;

    let customFields = {};
    if (customFieldsRaw) {
      try {
        customFields = JSON.parse(customFieldsRaw);
      } catch (e) {
        console.error("Failed to parse customFields", e);
      }
    }

    if (!file || !title) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Feature Toggles & Settings Check
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: ["STRICT_FILE_VALIDATION", "ENABLE_AUTO_OCR", "MAX_FILE_SIZE_MB", "ALLOWED_FILE_TYPES"] } }
    });
    const settingsMap = settings.reduce((acc: any, s) => { 
      acc[s.key] = (s.key === "MAX_FILE_SIZE_MB" || s.key === "ALLOWED_FILE_TYPES") ? s.value : (s.value === "true"); 
      return acc; 
    }, {});
    
    const isStrictValidation = settingsMap["STRICT_FILE_VALIDATION"] || false;
    const isAutoOcr = settingsMap["ENABLE_AUTO_OCR"] || false;
    const maxFileSizeMB = parseInt(settingsMap["MAX_FILE_SIZE_MB"] || "10", 10);
    const allowedFileTypesStr = settingsMap["ALLOWED_FILE_TYPES"] || "pdf, jpg, png, jpeg, docx, xlsx";
    
    const allowedExtensions = allowedFileTypesStr.split(",").map((t: string) => t.trim().toLowerCase());
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || "";

    // Validate File Extension
    if (!allowedExtensions.includes(fileExtension)) {
      return NextResponse.json(
        { error: `File type .${fileExtension} is not allowed. Allowed types: ${allowedFileTypesStr}` },
        { status: 400 }
      );
    }

    // Validate File Size
    if (file.size > maxFileSizeMB * 1024 * 1024) {
      return NextResponse.json(
        { error: `File size exceeds the maximum limit of ${maxFileSizeMB}MB` },
        { status: 400 }
      );
    }

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
      const now = new Date();
      const year = now.getFullYear();
      const shortYear = String(year).slice(-2);
      const month = String(now.getMonth() + 1).padStart(2, '0');
      
      let prefix = "DOC";
      let filterCondition: any = {
        createdAt: {
          gte: new Date(`${year}-${month}-01T00:00:00.000Z`),
          lt: new Date(year, now.getMonth() + 1, 1),
        }
      };

      if (documentType) {
        const typeDoc = await prisma.documentType.findUnique({
          where: { id: documentType }
        });
        if (typeDoc) {
          // Use first 2 characters of document type name or generic DOC
          prefix = typeDoc.name.substring(0, 2).toUpperCase() || "DOC";
          filterCondition.documentTypeRefId = documentType;
        }
      } else {
         filterCondition.departmentId = department.id;
      }

      const currentMonthDocs = await prisma.document.count({
        where: filterCondition
      });
      
      const runningNo = String(currentMonthDocs + 1).padStart(3, '0');
      documentCode = `${prefix}-${shortYear}${month}-${runningNo}`;
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
        documentTypeId: documentTypeId || null,
        customFields: customFields,
        documentCode,
        retentionPeriod,
        visibility: visibility as any,
        sharedDepartments: visibility === "CUSTOM" && sharedDepartmentsList.length > 0
          ? { connect: sharedDepartmentsList.map(id => ({ id })) }
          : undefined,
        currentVersion: 1,
        departmentId: session.user.departmentId,
        folderId: folderId || null,
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

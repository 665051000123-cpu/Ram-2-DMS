import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const { documentId } = await req.json();

    if (!documentId) {
      return NextResponse.json({ error: "Missing documentId" }, { status: 400 });
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (document.extractedText) {
      return NextResponse.json({ success: true, message: "Already extracted" });
    }

    // Resolve physical file path
    const urlParts = document.fileUrl.split('/').filter(Boolean);
    const relativePath = urlParts.slice(1).map(p => decodeURIComponent(p));
    
    let filePath = "";
    if (document.storagePath) {
      filePath = path.join(document.storagePath, ...relativePath);
    }
    
    if (!filePath || !fs.existsSync(filePath)) {
      const currentUploadDir = await import("@/lib/storage").then(m => m.getUploadDir());
      const currentPath = path.join(currentUploadDir, ...relativePath);
      if (fs.existsSync(currentPath)) {
        filePath = currentPath;
      } else {
        const defaultUploadDir = path.join(process.cwd(), "public", "uploads");
        const fallbackPath = path.join(defaultUploadDir, ...relativePath);
        if (fs.existsSync(fallbackPath)) {
          filePath = fallbackPath;
        }
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Physical file not found for OCR" }, { status: 404 });
    }

    const buffer = fs.readFileSync(filePath);
    let extractedText = "";

    if (document.fileType === "application/pdf" || filePath.toLowerCase().endsWith(".pdf")) {
      const pdfParse = require("pdf-parse");
      const data = await pdfParse(buffer);
      extractedText = data.text;
    } else if (document.fileType.startsWith("image/") || filePath.toLowerCase().match(/\.(jpg|jpeg|png)$/)) {
      const { createWorker } = require("tesseract.js");
      const worker = await createWorker("tha+eng");
      const { data: { text } } = await worker.recognize(buffer);
      extractedText = text;
      await worker.terminate();
    }

    if (extractedText && extractedText.trim().length > 0) {
      await prisma.document.update({
        where: { id: documentId },
        data: { extractedText },
      });

      const latestVersion = await prisma.documentVersion.findFirst({
        where: { documentId: documentId },
        orderBy: { version: "desc" },
      });

      if (latestVersion) {
        await prisma.documentVersion.update({
          where: { id: latestVersion.id },
          data: { extractedText },
        });
      }
    }

    return NextResponse.json({ success: true, extracted: true });
  } catch (error: any) {
    console.error("Internal OCR API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: ["MAX_FILE_SIZE_MB", "ALLOWED_FILE_TYPES", "SESSION_TIMEOUT_MINUTES"]
        }
      }
    });

    const settingsMap = settings.reduce((acc: any, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    return NextResponse.json({
      maxFileSizeMB: parseInt(settingsMap["MAX_FILE_SIZE_MB"] || "10", 10),
      allowedFileTypes: settingsMap["ALLOWED_FILE_TYPES"] || "pdf, jpg, png, jpeg, docx, xlsx",
      sessionTimeoutMinutes: parseInt(settingsMap["SESSION_TIMEOUT_MINUTES"] || "30", 10),
    });
  } catch (error: any) {
    console.error("Error fetching public settings:", error);
    return NextResponse.json({ maxFileSizeMB: 10 }); // fallback
  }
}

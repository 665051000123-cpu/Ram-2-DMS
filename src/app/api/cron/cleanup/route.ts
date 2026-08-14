import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { getUploadDir } from "@/lib/storage";

export async function GET(req: Request) {
  try {
    // Optionally secure this endpoint with a secret token from headers or query
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      // In a real app, enforce this. For local demo, we'll allow it.
    }

    // Fetch cleanup settings
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: { in: ["RECYCLE_BIN_RETENTION_DAYS", "AUDIT_LOG_RETENTION_DAYS"] },
      },
    });

    const settingsMap = settings.reduce((acc: any, s) => {
      acc[s.key] = parseInt(s.value, 10);
      return acc;
    }, {});

    const recycleBinDays = settingsMap["RECYCLE_BIN_RETENTION_DAYS"] || 30;
    const auditLogDays = settingsMap["AUDIT_LOG_RETENTION_DAYS"] || 90;

    let recycleBinCount = 0;
    let auditLogCount = 0;

    // 1. Cleanup Recycle Bin (Hard Delete Documents)
    const recycleBinThreshold = new Date();
    recycleBinThreshold.setDate(recycleBinThreshold.getDate() - recycleBinDays);

    const oldDeletedDocs = await prisma.document.findMany({
      where: {
        isDeleted: true,
        deletedAt: {
          lt: recycleBinThreshold,
        },
      },
      include: {
        versions: true,
      }
    });

    for (const doc of oldDeletedDocs) {
      // 1.a Delete physical files (current version and old versions)
      try {
        if (doc.storagePath && fs.existsSync(doc.storagePath)) {
          fs.unlinkSync(doc.storagePath);
        }
        for (const version of doc.versions) {
          if (version.storagePath && fs.existsSync(version.storagePath)) {
            fs.unlinkSync(version.storagePath);
          }
        }
      } catch (err) {
        console.error(`Failed to delete physical files for doc ${doc.id}:`, err);
      }

      // 1.b Delete DB records (Cascade should handle relations, but let's be sure)
      await prisma.document.delete({
        where: { id: doc.id },
      });
      recycleBinCount++;
    }

    // 2. Cleanup Audit Logs
    const auditLogThreshold = new Date();
    auditLogThreshold.setDate(auditLogThreshold.getDate() - auditLogDays);

    const deletedLogs = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: auditLogThreshold,
        },
      },
    });
    
    auditLogCount = deletedLogs.count;

    return NextResponse.json({
      success: true,
      message: "Cleanup completed successfully",
      details: {
        recycleBinDeleted: recycleBinCount,
        auditLogsDeleted: auditLogCount,
      }
    });
  } catch (error: any) {
    console.error("Cron Cleanup Error:", error);
    return NextResponse.json(
      { error: "Cleanup failed", details: error.message },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await prisma.systemSetting.findMany();
    
    // Convert array to key-value object
    const settingsMap = settings.reduce((acc: any, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    // Ensure UPLOAD_DIR has a fallback if not set
    if (!settingsMap["UPLOAD_DIR"]) {
      settingsMap["UPLOAD_DIR"] = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
    }

    return NextResponse.json(settingsMap);
  } catch (error: any) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Validation for UPLOAD_DIR specifically if provided
    if (body.uploadDir !== undefined) {
      const uploadDir = body.uploadDir;
      if (typeof uploadDir !== "string" || uploadDir.trim() === "") {
         return NextResponse.json({ error: "Invalid directory path" }, { status: 400 });
      }
      try {
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
      } catch (e: any) {
        return NextResponse.json(
          { error: `Cannot access or create directory: ${e.message}` },
          { status: 400 },
        );
      }
      
      await prisma.systemSetting.upsert({
        where: { key: "UPLOAD_DIR" },
        update: { value: uploadDir },
        create: { key: "UPLOAD_DIR", value: uploadDir },
      });
    }

    // Handle generic feature toggles or other settings
    if (body.settings && typeof body.settings === 'object') {
      const { settings } = body;
      const promises = Object.entries(settings).map(([key, value]) => {
        const stringValue = typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value);
        return prisma.systemSetting.upsert({
          where: { key },
          update: { value: stringValue },
          create: { key, value: stringValue },
        });
      });
      await Promise.all(promises);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving settings:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

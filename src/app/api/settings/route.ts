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

    const setting = await prisma.systemSetting.findUnique({
      where: { key: "UPLOAD_DIR" },
    });

    const uploadDir =
      setting?.value ||
      process.env.UPLOAD_DIR ||
      path.join(process.cwd(), "public", "uploads");

    return NextResponse.json({ uploadDir });
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

    const { uploadDir } = await request.json();

    if (!uploadDir || typeof uploadDir !== "string") {
      return NextResponse.json(
        { error: "Invalid directory path" },
        { status: 400 },
      );
    }

    // Try to create the directory if it doesn't exist to test permissions and validity
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

    return NextResponse.json({ success: true, uploadDir });
  } catch (error: any) {
    console.error("Error saving settings:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

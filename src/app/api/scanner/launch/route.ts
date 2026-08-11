import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exec } from "child_process";
import fs from "fs";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const setting = await prisma.systemSetting.findUnique({ where: { key: "SCANNER_APP_PATH" } });
    if (!setting || !setting.value) {
      return NextResponse.json({ error: "Scanner app path not configured in settings." }, { status: 400 });
    }

    const appPathConfig = setting.value.trim();
    
    // Extract the actual executable path to check if it exists
    let exePath = appPathConfig;
    if (exePath.startsWith('"')) {
      exePath = exePath.split('"')[1];
    } else {
      exePath = exePath.split(' ')[0];
    }

    if (!fs.existsSync(exePath)) {
      return NextResponse.json({ error: "Scanner app executable not found at specified path." }, { status: 404 });
    }

    // Launch the application (Windows)
    let launchCmd = appPathConfig;
    // If it doesn't start with quote and has no spaces in path, or it's just a raw path without quotes
    if (!appPathConfig.startsWith('"') && !appPathConfig.includes('"')) {
       launchCmd = `"${appPathConfig}"`;
    }

    exec(`start "" ${launchCmd}`, (error) => {
      if (error) {
        console.error("Failed to launch scanner app:", error);
      }
    });

    return NextResponse.json({ success: true, message: "Scanner app launched" });

  } catch (error) {
    console.error("Error launching scanner app:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

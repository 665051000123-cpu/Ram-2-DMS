import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

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
    }

    if (!fs.existsSync(exePath)) {
      return NextResponse.json({ error: "Scanner app executable not found at specified path." }, { status: 404 });
    }

    // Get the directory of the executable to use as working directory
    const exeDir = path.dirname(exePath);

    try {
      const { exec } = require("child_process");
      // Use explorer.exe to launch the app or shortcut in the user's interactive desktop context.
      // This mimics a double-click and ensures TWAIN drivers initialize correctly.
      exec(`explorer.exe "${exePath}"`, (error: any) => {
        if (error) {
          console.error("Failed to launch scanner:", error);
        }
      });
    } catch (error) {
      console.error("Failed to spawn scanner app:", error);
    }

    return NextResponse.json({ success: true, message: "Scanner app launched" });

  } catch (error) {
    console.error("Error launching scanner app:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

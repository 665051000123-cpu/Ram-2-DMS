import { prisma } from "./prisma";
import path from "path";

/**
 * ดึงที่เก็บไฟล์ (Upload Directory) จากฐานข้อมูล
 * หากไม่มีการตั้งค่าไว้ จะใช้ค่าเริ่มต้น (process.env.UPLOAD_DIR หรือ public/uploads)
 */
export async function getUploadDir(): Promise<string> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "UPLOAD_DIR" },
    });

    if (setting && setting.value) {
      return setting.value;
    }
  } catch (error) {
    console.error("Failed to get UPLOAD_DIR from database:", error);
  }

  // Fallback
  return (
    process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads")
  );
}

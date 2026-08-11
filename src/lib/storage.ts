import { prisma } from "./prisma";
import path from "path";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
}

export async function getS3Settings() {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: ["S3_ENABLED", "S3_ENDPOINT", "S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY", "S3_SECRET_KEY"] } }
    });
    
    const map = settings.reduce((acc: any, s) => { acc[s.key] = s.value; return acc; }, {});
    
    return {
      enabled: map["S3_ENABLED"] === "true",
      endpoint: map["S3_ENDPOINT"],
      bucket: map["S3_BUCKET"],
      region: map["S3_REGION"],
      accessKey: map["S3_ACCESS_KEY"],
      secretKey: map["S3_SECRET_KEY"]
    };
  } catch (error) {
    console.error("Failed to get S3 settings:", error);
    return { enabled: false };
  }
}

/**
 * Uploads a file to local storage and optionally backs it up to Cloud Storage (S3/MinIO)
 */
export async function uploadFileToStorage(
  buffer: Buffer, 
  filename: string, 
  folderName: string, 
  mimeType: string
): Promise<{ fileUrl: string, storagePath: string }> {
  
  // 1. Local Storage
  const baseUploadDir = await getUploadDir();
  const uploadDir = path.join(baseUploadDir, folderName);
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, buffer);
  const fileUrl = `/uploads/${folderName}/${filename}`;

  // 2. Cloud Backup (Async fire and forget, or await)
  const s3 = await getS3Settings();
  if (s3.enabled && s3.bucket && s3.accessKey && s3.secretKey) {
    try {
      const client = new S3Client({
        region: s3.region || "auto",
        endpoint: s3.endpoint ? s3.endpoint : undefined,
        credentials: {
          accessKeyId: s3.accessKey,
          secretAccessKey: s3.secretKey
        },
        forcePathStyle: true // Needed for MinIO and some S3 compatibles
      });

      const s3Key = `${folderName}/${filename}`;
      const command = new PutObjectCommand({
        Bucket: s3.bucket,
        Key: s3Key,
        Body: buffer,
        ContentType: mimeType
      });

      // Background upload to avoid blocking the user
      client.send(command).then(() => {
        console.log(`Successfully backed up ${s3Key} to S3`);
      }).catch(err => {
        console.error(`S3 Backup Failed for ${s3Key}:`, err);
      });
      
    } catch (e) {
      console.error("S3 Setup Error:", e);
    }
  }

  return { fileUrl, storagePath: baseUploadDir };
}

import fs from "fs";
import path from "path";

/**
 * Deletes files in a directory that are older than `days` days.
 * Specifically targeting scanner files that were abandoned.
 */
export function cleanupOldScannerFiles(dirPath: string, days: number = 3) {
  try {
    if (!fs.existsSync(dirPath)) return;

    const files = fs.readdirSync(dirPath);
    const now = Date.now();
    const maxAgeMs = days * 24 * 60 * 60 * 1000;

    let deletedCount = 0;

    for (const file of files) {
      // Don't touch 'processed' or hidden folders/files
      if (file === "processed" || file.startsWith(".")) continue;

      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);

      if (!stat.isDirectory()) {
        const ageMs = now - stat.mtimeMs;
        if (ageMs > maxAgeMs) {
          fs.unlinkSync(fullPath);
          deletedCount++;
          console.log(`[Auto-Cleanup] Deleted abandoned scanner file: ${file}`);
        }
      }
    }
    
    if (deletedCount > 0) {
      console.log(`[Auto-Cleanup] Finished. Deleted ${deletedCount} abandoned files older than ${days} days.`);
    }
  } catch (error) {
    console.error("[Auto-Cleanup] Failed to clean up scanner files:", error);
  }
}

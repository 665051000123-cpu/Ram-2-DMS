import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";
import { getUploadDir } from "@/lib/storage";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const resolvedParams = await params;
    const pathArray = resolvedParams.path;

    // Validate path to prevent directory traversal
    if (pathArray.some((p) => p.includes(".."))) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const baseUploadDir = await getUploadDir();

    // Decode path components because URLs like /uploads/%E0%B9%81... will be decoded by Next.js router
    // but just in case we need to map them properly.
    const decodedPathArray = pathArray.map((p) => decodeURIComponent(p));
    const filePath = path.join(baseUploadDir, ...decodedPathArray);

    // Double check traversal
    if (!filePath.startsWith(baseUploadDir)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (!fs.existsSync(filePath)) {
      return new NextResponse("File Not Found: " + filePath, { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileStream = fs.createReadStream(filePath) as any;

    const ext = path.extname(filePath).toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === ".pdf") contentType = "application/pdf";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".gif") contentType = "image/gif";

    return new NextResponse(fileStream, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": stat.size.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("File serving error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

// Configuration
const WATCH_DIR = path.join(__dirname, 'scanned-docs');
const PROCESSED_DIR = path.join(WATCH_DIR, 'processed');

// Ensure directories exist
if (!fs.existsSync(WATCH_DIR)) fs.mkdirSync(WATCH_DIR, { recursive: true });
if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true });

console.log('=============================================');
console.log('  DMS Auto-Scanner Sync Service Started');
console.log('=============================================');
console.log(`Watching directory: ${WATCH_DIR}`);
console.log('Waiting for scanned documents...\n');

async function getAdminUser() {
  const admin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
    include: { department: true }
  });
  if (!admin) {
    throw new Error('No SUPER_ADMIN found in the database. Cannot assign uploaded documents.');
  }
  return admin;
}

const watcher = chokidar.watch(WATCH_DIR, {
  ignored: /(^|[\/\\])\..|processed/, // ignore hidden files and processed folder
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 2000, // Wait 2 seconds after file size stops changing
    pollInterval: 100
  }
});

watcher.on('add', async (filePath) => {
  const fileName = path.basename(filePath);
  console.log(`[${new Date().toLocaleTimeString()}] New file detected: ${fileName}`);
  
  try {
    // 1. Get Admin User
    const admin = await getAdminUser();
    
    // 2. Prepare Upload Destination
    let baseUploadDir = path.join(__dirname, 'public', 'uploads');
    try {
      const setting = await prisma.systemSetting.findUnique({ where: { key: 'UPLOAD_DIR' } });
      if (setting && setting.value) {
        baseUploadDir = setting.value;
      }
    } catch (e) {
      console.error('Failed to fetch UPLOAD_DIR from DB, using default:', e.message);
    }

    const fileExtension = fileName.split('.').pop();
    const uniqueFilename = `${uuidv4()}.${fileExtension}`;
    const deptFolderName = admin.department.name.replace(/[^a-zA-Z0-9-_\u0E00-\u0E7F]/g, '_');
    
    const uploadDir = path.join(baseUploadDir, deptFolderName);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const destinationPath = path.join(uploadDir, uniqueFilename);
    
    // 3. Copy file to public/uploads
    fs.copyFileSync(filePath, destinationPath);
    
    // Determine file type
    let fileType = 'application/octet-stream';
    if (fileExtension.toLowerCase() === 'pdf') fileType = 'application/pdf';
    else if (['jpg', 'jpeg'].includes(fileExtension.toLowerCase())) fileType = 'image/jpeg';
    else if (fileExtension.toLowerCase() === 'png') fileType = 'image/png';

    const fileUrl = `/uploads/${deptFolderName}/${uniqueFilename}`;
    const titleWithoutExt = fileName.replace(`.${fileExtension}`, '');

    // 4. Save to Database
    const newDocument = await prisma.document.create({
      data: {
        title: titleWithoutExt,
        description: 'อัปโหลดอัตโนมัติจากระบบสแกนเอกสาร',
        fileUrl: fileUrl,
        fileType: fileType,
        tags: 'Scanned',
        documentType: 'อื่นๆ',
        currentVersion: 1,
        departmentId: admin.departmentId,
        uploaderId: admin.id,
        visibility: 'PRIVATE', // Admin only initially
        versions: {
          create: {
            version: 1,
            fileUrl: fileUrl,
            fileType: fileType,
            uploaderId: admin.id,
          }
        }
      },
    });

    // 5. Track UPLOAD action
    await prisma.auditLog.create({
      data: {
        action: 'UPLOAD',
        documentId: newDocument.id,
        userId: admin.id,
        details: `Auto-uploaded scanned file: ${fileName}`
      }
    });

    // 6. Move original file to processed folder
    const processedPath = path.join(PROCESSED_DIR, `${Date.now()}_${fileName}`);
    fs.renameSync(filePath, processedPath);

    console.log(`[Success] Document saved as "${titleWithoutExt}" and assigned to ${admin.name} (PRIVATE).`);
    
    // 7. Check if Auto OCR is enabled and trigger it
    try {
      const ocrSetting = await prisma.systemSetting.findUnique({ where: { key: 'ENABLE_AUTO_OCR' } });
      if (ocrSetting && ocrSetting.value === 'true') {
        console.log(`[OCR] Triggering OCR for document ${newDocument.id}...`);
        // Using global fetch (Node 18+)
        fetch('http://localhost:5175/api/internal/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: newDocument.id })
        }).then(res => res.json())
          .then(data => {
             if (data.success) console.log(`[OCR] Success for document ${newDocument.id}`);
             else console.error(`[OCR Error]`, data.error);
          })
          .catch(err => console.error(`[OCR Request Error] Trigger failed:`, err.message));
      }
    } catch (e) {
      console.error(`[OCR Setup Error] Failed to check OCR setting:`, e.message);
    }
    
  } catch (error) {
    console.error(`[Error] Failed to process ${fileName}:`, error.message);
  }
});

watcher.on('error', error => console.error(`Watcher error: ${error}`));


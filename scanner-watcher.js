const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function startWatcher() {
  // Fetch configuration from DB
  let WATCH_DIR = path.join(__dirname, 'scanned-docs');
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'SCANNER_DIR' } });
    if (setting && setting.value) {
      WATCH_DIR = setting.value;
    }
  } catch (e) {
    console.error('Failed to fetch SCANNER_WATCH_DIR from DB, using default:', e.message);
  }

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

  async function getDepartmentHead(deptName) {
    const dept = await prisma.department.findFirst({
      where: { name: { equals: deptName } }
    });
    
    if (dept) {
      const head = await prisma.user.findFirst({
        where: { departmentId: dept.id, role: 'DEPT_HEAD' },
        include: { department: true }
      });
      
      if (head) return { user: head, dept: dept };
      
      const anyUser = await prisma.user.findFirst({
        where: { departmentId: dept.id },
        include: { department: true }
      });
      if (anyUser) return { user: anyUser, dept: dept };
      
      return { user: null, dept: dept };
    }
    
    return null;
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
  const relativePath = path.relative(WATCH_DIR, filePath);
  const subFolderName = path.dirname(relativePath);
  
  const fileName = path.basename(filePath);
  const isSubFolder = subFolderName && subFolderName !== '.' && subFolderName !== 'processed';
  
  console.log(`[${new Date().toLocaleTimeString()}] New file detected: ${fileName} ${isSubFolder ? `in [${subFolderName}]` : ''}`);
  
  try {
    const admin = await getAdminUser();
    let targetUser = admin;
    let targetDept = admin.department;
    let targetVisibility = 'PRIVATE';
    
    if (isSubFolder) {
      const deptData = await getDepartmentHead(subFolderName);
      if (deptData) {
        targetDept = deptData.dept;
        if (deptData.user) {
          targetUser = deptData.user;
          targetVisibility = 'DEPARTMENT';
          console.log(`   -> Routing to department: ${targetDept.name} (Assigned to: ${targetUser.name})`);
        } else {
          targetVisibility = 'DEPARTMENT';
          console.log(`   -> Routing to department: ${targetDept.name} (Assigned to: SUPER_ADMIN)`);
        }
      } else {
        console.log(`   -> Department [${subFolderName}] not found, routing to SUPER_ADMIN.`);
      }
    }
    
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
    const deptFolderName = targetDept ? targetDept.name.replace(/[^a-zA-Z0-9-_\u0E00-\u0E7F]/g, '_') : 'general';
    
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
        departmentId: targetDept ? targetDept.id : admin.departmentId,
        uploaderId: targetUser.id,
        versions: {
          create: {
            version: 1,
            fileUrl: fileUrl,
            fileType: fileType,
            uploaderId: targetUser.id,
          }
        }
      },
    });

    // 5. Track UPLOAD action
    await prisma.auditLog.create({
      data: {
        action: 'UPLOAD',
        documentId: newDocument.id,
        userId: targetUser.id,
        details: `Auto-uploaded scanned file: ${fileName}`
      }
    });

    // 6. Move original file to processed folder
    const processedPath = path.join(PROCESSED_DIR, `${Date.now()}_${fileName}`);
    fs.renameSync(filePath, processedPath);

    console.log(`[Success] Document saved as "${titleWithoutExt}" and assigned to ${targetUser.name} (${targetVisibility}).`);
    
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

} // End of startWatcher()

startWatcher();

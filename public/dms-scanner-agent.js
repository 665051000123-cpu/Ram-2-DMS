/**
 * DMS Scanner Agent (Local Client Agent)
 * 
 * หน้าที่ของโปรแกรมนี้คือการรันเป็นเซิร์ฟเวอร์ขนาดเล็กบนเครื่องพนักงาน (Client) ที่พอร์ต 35555
 * เพื่อให้หน้าเว็บ (Web App) สามารถสั่งเปิดโปรแกรมสแกนและดึงไฟล์ที่เพิ่งสแกนเสร็จกลับไปยังหน้าเว็บได้โดยอัตโนมัติ
 * 
 * ความต้องการระบบ: Node.js
 * วิธีใช้งาน: node dms-scanner-agent.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 35555;
let currentWatcher = null;
let scanTimeout = null;

const server = http.createServer((req, res) => {
  // === CORS Headers ===
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  // === 1. เช็คสถานะการเชื่อมต่อ ===
  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', version: '1.0.0' }));
  }

  // === 2. รับคำสั่งเปิดโปรแกรมสแกนและรอรับไฟล์ ===
  if (req.method === 'POST' && req.url === '/scan') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const { watchDir, appPath } = JSON.parse(body);

        if (!watchDir) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'watchDir is required' }));
        }

        // 1. ตรวจสอบและสร้างโฟลเดอร์ถ้ายังไม่มี
        if (!fs.existsSync(watchDir)) {
          fs.mkdirSync(watchDir, { recursive: true });
        }

        // 2. เคลียร์ Watcher เก่าทิ้ง
        if (currentWatcher) {
          currentWatcher.close();
        }
        if (scanTimeout) {
          clearTimeout(scanTimeout);
        }

        // 3. สั่งเปิดโปรแกรมสแกน
        const scannerApp = appPath || "C:\\Program Files\\NAPS2\\NAPS2.exe";
        exec(`explorer.exe "${scannerApp}"`, (err) => {
          if (err) console.error("Error launching scanner app:", err);
        });

        console.log(`[DMS Agent] Launching Scanner and watching directory: ${watchDir}`);

        // 4. เริ่มเฝ้าดูโฟลเดอร์ (รอไฟล์ใหม่)
        let fileFound = false;

        currentWatcher = fs.watch(watchDir, (eventType, filename) => {
          if (fileFound) return;
          
          if (eventType === 'rename' && filename) {
            const filePath = path.join(watchDir, filename);
            
            // ตรวจสอบว่าไฟล์มีอยู่จริงและไม่ใช่โฟลเดอร์
            if (fs.existsSync(filePath)) {
              const stat = fs.statSync(filePath);
              if (stat.isFile() && stat.size > 0) {
                // รอให้โปรแกรมเขียนไฟล์เสร็จก่อน (ดีเลย์ 1 วินาที)
                setTimeout(() => {
                  try {
                    const finalStat = fs.statSync(filePath);
                    if (finalStat.size > 0) {
                      fileFound = true;
                      console.log(`[DMS Agent] File scanned: ${filename}`);
                      
                      // อ่านไฟล์และส่งกลับไปให้ Browser แบบ Base64
                      const fileBuffer = fs.readFileSync(filePath);
                      const base64Data = fileBuffer.toString('base64');
                      const mimeType = filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';
                      
                      res.writeHead(200, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({
                        success: true,
                        filename: filename,
                        mimeType: mimeType,
                        data: base64Data
                      }));
                      
                      currentWatcher.close();
                      clearTimeout(scanTimeout);
                    }
                  } catch (e) {
                    console.error("Error reading file:", e);
                  }
                }, 1000); // รอ 1 วินาทีให้เขียนไฟล์เสร็จ
              }
            }
          }
        });

        // 5. ตั้งเวลา Timeout (รอสูงสุด 10 นาที)
        scanTimeout = setTimeout(() => {
          if (!fileFound) {
            console.log(`[DMS Agent] Scan timeout after 10 minutes`);
            if (currentWatcher) currentWatcher.close();
            res.writeHead(408, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Scan timeout. No file received.' }));
          }
        }, 10 * 60 * 1000);

      } catch (err) {
        console.error(err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('===================================================');
  console.log(` DMS Scanner Agent is running on http://127.0.0.1:${PORT}`);
  console.log(` Keep this window open while using the DMS Scanner`);
  console.log('===================================================');
});

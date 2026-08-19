const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 35555;

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'connected', version: '1.0', port: currentPort }));
    return;
  }

  if (req.method === 'GET' && req.url === '/shutdown') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Agent shutting down' }));
    setTimeout(() => process.exit(0), 500);
    return;
  }

  if (req.method === 'POST' && req.url === '/scan') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const { watchDir, appPath } = JSON.parse(body);
        
        if (!watchDir || !appPath) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Missing parameters' }));
          return;
        }

        console.log(`[SCAN REQUEST] Launching: ${appPath}`);
        console.log(`[SCAN REQUEST] Watching: ${watchDir}`);

        // Mark the start time to find NEW files only
        const startTime = Date.now();

        // 1. Launch the scanner app
        let exePath = appPath;
        
        // Remove all double quotes if user accidentally typed them
        exePath = exePath.replace(/"/g, '');
        // Remove trailing backslash (because it escapes the closing quote in CMD)
        exePath = exePath.replace(/\\+$/, '');
        
        exec(`start "" "${exePath}"`, (error) => {
          if (error) console.error("Failed to launch scanner:", error);
        });

        // 2. Poll the directory for a new file for up to 10 minutes
        const timeoutMs = 10 * 60 * 1000;
        const intervalMs = 2000;
        let elapsed = 0;

        const checkInterval = setInterval(() => {
          elapsed += intervalMs;
          if (elapsed >= timeoutMs) {
            clearInterval(checkInterval);
            res.writeHead(408, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Timeout waiting for scan' }));
            return;
          }

          if (!fs.existsSync(watchDir)) return;

          const files = fs.readdirSync(watchDir);
          for (const file of files) {
            if (file === "processed" || file.startsWith(".")) continue;
            
            const fullPath = path.join(watchDir, file);
            const stat = fs.statSync(fullPath);
            
            if (stat.isFile() && stat.mtimeMs > startTime) {
              // Found a new file! Wait a tiny bit for it to finish writing
              clearInterval(checkInterval);
              
              setTimeout(() => {
                try {
                  const fileData = fs.readFileSync(fullPath);
                  const base64Data = fileData.toString('base64');
                  
                  const ext = path.extname(fullPath).toLowerCase();
                  let mimeType = 'application/octet-stream';
                  if (ext === '.pdf') mimeType = 'application/pdf';
                  else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
                  else if (ext === '.png') mimeType = 'image/png';

                  console.log(`[SUCCESS] Found new scanned file: ${file}`);
                  
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({
                    success: true,
                    filename: file,
                    mimeType,
                    data: base64Data
                  }));
                } catch (readErr) {
                  console.error(readErr);
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: false, error: 'Failed to read file' }));
                }
              }, 1000); // Wait 1 sec for file to be completely written
              
              return;
            }
          }
        }, intervalMs);

      } catch (err) {
        console.error(err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

let currentPort = 35555;
const maxPort = 35565;

function startServer(port) {
  currentPort = port;
  server.listen(port, '127.0.0.1', () => {
    console.log('===================================================');
    console.log('   DMS Scanner Agent (Local Background Service)    ');
    console.log('===================================================');
    console.log(`\n✅ Agent is running and listening on port ${port}`);
    console.log(`\n⏳ Waiting for scan commands from DMS Website...`);
    console.log(`\n[สามารถกดกากบาทปิดหน้าต่างนี้ หรือรันผ่าน Start-Hidden.vbs เพื่อซ่อนได้]`);
  }).on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      if (port < maxPort) {
        startServer(port + 1);
      } else {
        console.error("❌ ไม่สามารถเปิดโปรแกรมได้ เนื่องจาก Port 35555-35565 ถูกใช้งานทั้งหมด");
        process.exit(1);
      }
    } else {
      console.error(e);
    }
  });
}

startServer(currentPort);

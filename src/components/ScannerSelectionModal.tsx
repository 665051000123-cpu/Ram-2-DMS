"use client";

import React, { useState, useEffect } from "react";
import { Inbox, RefreshCw, X, Loader2, FileText, FileImage, Settings } from "lucide-react";
import toast from "react-hot-toast";

type ScannerSelectionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (file: File) => void;
};

export default function ScannerSelectionModal({
  isOpen,
  onClose,
  onFileSelect,
}: ScannerSelectionModalProps) {
  const [scannedFiles, setScannedFiles] = useState<any[]>([]);
  const [isLoadingScanned, setIsLoadingScanned] = useState(false);
  const [scannerListeningTime, setScannerListeningTime] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // Local Settings State
  const [localWatchDir, setLocalWatchDir] = useState("");
  const [localAppPath, setLocalAppPath] = useState("");

  useEffect(() => {
    // Load local settings on mount
    const savedDir = localStorage.getItem("dms_local_scanner_dir") || "";
    const savedApp = localStorage.getItem("dms_local_scanner_app") || "";
    setLocalWatchDir(savedDir);
    setLocalAppPath(savedApp);
  }, []);

  useEffect(() => {
    if (isOpen) {
      startScannerAutoDetect();
    }
  }, [isOpen]);

  const startScannerAutoDetect = async () => {
    try {
      // 1. Fetch settings from server as fallback
      const settingsRes = await fetch("/api/settings");
      const settings = await settingsRes.json();
      
      // Get paths (prioritize localStorage, then system settings, then default)
      const watchDir = localStorage.getItem("dms_local_scanner_dir") || settings.SCANNER_DIR || "D:\\scanned-docs";
      const appPath = localStorage.getItem("dms_local_scanner_app") || settings.SCANNER_APP_PATH || "C:\\Program Files\\NAPS2\\NAPS2.exe";

      const now = Date.now();
      setScannerListeningTime(now);
      setScannedFiles([]);

      // Trigger the server to launch the scanner driver
      await fetch("/api/scanner/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appPath })
      });

      // Load initial files
      loadScannedFiles(watchDir);
    } catch (e) {
      console.error(e);
      toast.error("ไม่สามารถเปิดโปรแกรมสแกนได้");
    }
  };

  const loadScannedFiles = async (overrideWatchDir?: string) => {
    setIsLoadingScanned(true);
    try {
      const dir = overrideWatchDir || localStorage.getItem("dms_local_scanner_dir") || "";
      const res = await fetch(`/api/scanner/list?watchDir=${encodeURIComponent(dir)}`);
      const data = await res.json();
      if (data.files) setScannedFiles(data.files);
    } catch (e) {
      toast.error("ไม่สามารถดึงข้อมูลจากเครื่องสแกนได้");
    } finally {
      setIsLoadingScanned(false);
    }
  };

  const handleSelectScannedFile = async (filePath: string, fileName: string) => {
    const loadingToast = toast.loading("กำลังเตรียมไฟล์...");
    try {
      const dir = localStorage.getItem("dms_local_scanner_dir") || "";
      const res = await fetch(`/api/scanner/file?path=${encodeURIComponent(filePath)}&watchDir=${encodeURIComponent(dir)}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const blob = await res.blob();
      const newFile = new File([blob], fileName, { type: blob.type });
      onFileSelect(newFile);
      toast.success("ดึงไฟล์สำเร็จ", { id: loadingToast });
    } catch (e) {
      toast.error("ดึงไฟล์ไม่สำเร็จ", { id: loadingToast });
    }
  };

  // Scanner Polling Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isOpen && scannerListeningTime) {
      interval = setInterval(async () => {
        try {
          const dir = localStorage.getItem("dms_local_scanner_dir") || "";
          const res = await fetch(`/api/scanner/latest?since=${scannerListeningTime}&watchDir=${encodeURIComponent(dir)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.file) {
              clearInterval(interval);
              handleSelectScannedFile(data.file.path, data.file.name);
            }
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, scannerListeningTime]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex flex-col items-center justify-center z-[70] p-4">
      <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 dark:border-slate-600 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-lg">
            <Inbox className="text-blue-600 dark:text-blue-400" />
            ดึงไฟล์จากเครื่องสแกน
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors ${showSettings ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"}`}
              title="ตั้งค่าเครื่องสแกน"
            >
              <Settings size={20} />
            </button>
            <button
              onClick={() => loadScannedFiles()}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              title="รีเฟรช"
            >
              <RefreshCw size={20} className={isLoadingScanned ? "animate-spin" : ""} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-800/50">
          {showSettings ? (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Settings className="text-blue-500" size={20} />
                ตั้งค่าเครื่องสแกน (เฉพาะเครื่องนี้)
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                การตั้งค่าเหล่านี้จะถูกบันทึกไว้ในเบราว์เซอร์ของเครื่องนี้เท่านั้น ไม่ส่งผลกระทบต่อเครื่องอื่นๆ
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    โฟลเดอร์เก็บไฟล์สแกน (Scanner Watch Directory)
                  </label>
                  <input
                    type="text"
                    value={localWatchDir}
                    onChange={(e) => setLocalWatchDir(e.target.value)}
                    placeholder="เช่น D:\scanned-docs\processed"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">เว้นว่างไว้เพื่อใช้ค่าเริ่มต้นจากระบบ</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Path ของโปรแกรมสแกน (Scanner App Path)
                  </label>
                  <input
                    type="text"
                    value={localAppPath}
                    onChange={(e) => setLocalAppPath(e.target.value)}
                    placeholder="เช่น C:\Program Files\NAPS2\NAPS2.exe"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="pt-4 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      localStorage.setItem("dms_local_scanner_dir", localWatchDir);
                      localStorage.setItem("dms_local_scanner_app", localAppPath);
                      toast.success("บันทึกการตั้งค่าสำหรับเครื่องนี้เรียบร้อยแล้ว");
                      setShowSettings(false);
                      startScannerAutoDetect(); // Restart process with new settings
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    บันทึกการตั้งค่า
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {scannerListeningTime && !isLoadingScanned && (
                <div className="mb-6 bg-blue-50 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-800 rounded-xl p-6 text-center shadow-sm">
                  <div className="flex justify-center mb-4 relative">
                    <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-20"></div>
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300 relative z-10">
                      <Inbox size={32} className="animate-pulse" />
                    </div>
                  </div>
                  <h4 className="text-lg font-bold text-blue-800 dark:text-blue-300 mb-2">
                    กำลังเปิดโปรแกรมและรอรับไฟล์...
                  </h4>
                  <p className="text-blue-600 dark:text-blue-400 text-sm">
                    กรุณาสแกนเอกสารให้เสร็จสิ้น ระบบจะดึงไฟล์เข้ามาที่นี่โดยอัตโนมัติ
                  </p>
                </div>
              )}

              {isLoadingScanned ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <RefreshCw size={32} className="animate-spin mb-4 text-blue-500" />
                  <p>กำลังดึงข้อมูลจากโฟลเดอร์สแกน...</p>
                </div>
              ) : scannedFiles.length === 0 ? (
                !scannerListeningTime && (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <Inbox size={48} className="mb-4 text-slate-300 dark:text-slate-600" />
                    <p>ไม่พบไฟล์ในโฟลเดอร์สแกน</p>
                    <p className="text-sm mt-2 text-slate-400">ลองสแกนเอกสารใหม่หรือกดรีเฟรช</p>
                  </div>
                )
              ) : (
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300 text-sm mb-3">หรือเลือกไฟล์ที่มีอยู่แล้วในโฟลเดอร์</h4>
                  {scannedFiles.map((f, i) => (
                    <div 
                      key={i} 
                      className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between hover:border-blue-300 dark:hover:border-blue-600 transition-colors group cursor-pointer"
                      onClick={() => handleSelectScannedFile(f.path, f.name)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                          {f.name.toLowerCase().endsWith('.pdf') ? <FileText size={20} /> : <FileImage size={20} />}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1 break-all">
                            {f.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                            <span>{(f.size / 1024).toFixed(1)} KB</span>
                            <span>•</span>
                            <span>{new Date(f.date).toLocaleString('th-TH')}</span>
                            {f.path.includes('/') && (
                              <>
                                <span>•</span>
                                <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-[10px]">
                                  {f.path.split('/')[0]}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <button className="px-4 py-1.5 bg-slate-100 dark:bg-slate-700 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-50 dark:hover:bg-blue-900/50 shrink-0 ml-2">
                        เลือก
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

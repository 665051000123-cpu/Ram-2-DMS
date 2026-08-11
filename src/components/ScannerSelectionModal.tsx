"use client";

import React, { useState, useEffect } from "react";
import { Inbox, RefreshCw, X, Loader2, FileText, FileImage } from "lucide-react";
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
  const [isScannerAppLaunching, setIsScannerAppLaunching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      startScannerAutoDetect();
    }
  }, [isOpen]);

  const startScannerAutoDetect = async () => {
    setIsScannerAppLaunching(true);
    const now = Date.now();
    setScannerListeningTime(now);
    setScannedFiles([]); // Clear old files to focus on the new one
    
    try {
      const res = await fetch("/api/scanner/launch", { method: "POST" });
      if (!res.ok) {
        if (res.status === 400) {
           toast.error("ยังไม่ได้ตั้งค่าโปรแกรมสแกนในหน้าตั้งค่าระบบ");
        } else if (res.status === 404) {
           toast.error("หาไฟล์ .exe ของโปรแกรมสแกนไม่พบ กรุณาเช็ค Path ในตั้งค่าอีกครั้ง");
        } else {
           toast.error("เปิดโปรแกรมสแกนอัตโนมัติไม่สำเร็จ");
        }
      }
    } catch (e) {
      console.error("Failed to launch scanner", e);
    } finally {
      setIsScannerAppLaunching(false);
      loadScannedFiles(); // Load existing files just in case
    }
  };

  const loadScannedFiles = async () => {
    setIsLoadingScanned(true);
    try {
      const res = await fetch("/api/scanner/list");
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
      const res = await fetch(`/api/scanner/file?path=${encodeURIComponent(filePath)}`);
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
          const res = await fetch(`/api/scanner/latest?since=${scannerListeningTime}`);
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
      <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-slate-100 dark:border-slate-600 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-lg">
            <Inbox className="text-blue-600 dark:text-blue-400" />
            ดึงไฟล์จากเครื่องสแกน
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={loadScannedFiles}
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
          {scannerListeningTime && (
            <div className="mb-6 bg-blue-50 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-800 rounded-xl p-6 text-center shadow-sm">
              <div className="flex justify-center mb-4 relative">
                <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-20"></div>
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300 relative z-10">
                  {isScannerAppLaunching ? (
                    <Loader2 size={32} className="animate-spin" />
                  ) : (
                    <Inbox size={32} className="animate-pulse" />
                  )}
                </div>
              </div>
              <h4 className="text-lg font-bold text-blue-800 dark:text-blue-300 mb-2">
                {isScannerAppLaunching ? "กำลังเรียกเปิดโปรแกรมสแกน..." : "กำลังรอรับไฟล์จากเครื่องสแกน..."}
              </h4>
              <p className="text-blue-600 dark:text-blue-400 text-sm">
                กรุณาทำการสแกนเอกสารในโปรแกรมสแกนเนอร์ให้เสร็จสิ้น ระบบจะดึงไฟล์เข้ามาโดยอัตโนมัติ
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
        </div>
      </div>
    </div>
  );
}

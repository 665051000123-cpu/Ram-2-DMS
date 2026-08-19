"use client";

import React, { useState, useEffect } from "react";
import { Inbox, RefreshCw, X, FileText, FileImage, FolderSearch } from "lucide-react";
import toast from "react-hot-toast";

type ScannerSelectionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (file: File) => void;
};

// Global variable to keep the handle in memory during the session
let globalDirHandle: any = null;

export default function ScannerSelectionModal({
  isOpen,
  onClose,
  onFileSelect,
}: ScannerSelectionModalProps) {
  const [dirHandle, setDirHandle] = useState<any>(null);
  const [scannedFiles, setScannedFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [watchStartTime, setWatchStartTime] = useState<number | null>(null);
  const [isBrowserSupported, setIsBrowserSupported] = useState(true);

  // Check browser support on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !('showDirectoryPicker' in window)) {
      setIsBrowserSupported(false);
    }
  }, []);

  // Initialize session handle if exists
  useEffect(() => {
    if (isOpen) {
      if (globalDirHandle) {
        setDirHandle(globalDirHandle);
        startWatching(globalDirHandle);
      }
    } else {
      // Reset state when closed
      setIsWatching(false);
      setWatchStartTime(null);
    }
  }, [isOpen]);

  const requestDirectoryAccess = async () => {
    try {
      // Request access to a directory
      const handle = await (window as any).showDirectoryPicker({
        mode: "read"
      });
      globalDirHandle = handle;
      setDirHandle(handle);
      startWatching(handle);
      toast.success("เชื่อมต่อโฟลเดอร์สำเร็จ");
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error(err);
        toast.error("ไม่สามารถเข้าถึงโฟลเดอร์ได้");
      }
    }
  };

  const startWatching = async (handle: any) => {
    setIsWatching(true);
    setWatchStartTime(Date.now());
    await loadFiles(handle);
  };

  const getFilesInDir = async (handle: any) => {
    const files = [];
    for await (const entry of handle.values()) {
      if (entry.kind === 'file') {
        const file = await entry.getFile();
        const ext = file.name.toLowerCase();
        if (ext.endsWith('.pdf') || ext.endsWith('.jpg') || ext.endsWith('.png') || ext.endsWith('.jpeg')) {
          files.push({
            name: file.name,
            size: file.size,
            lastModified: file.lastModified,
            file: file // Store the actual File object
          });
        }
      }
    }
    // Sort by last modified (newest first)
    return files.sort((a, b) => b.lastModified - a.lastModified);
  };

  const loadFiles = async (handle: any) => {
    setIsLoading(true);
    try {
      const files = await getFilesInDir(handle);
      setScannedFiles(files);
    } catch (e) {
      console.error(e);
      toast.error("เกิดข้อผิดพลาดในการอ่านไฟล์");
      setIsWatching(false);
      setDirHandle(null);
      globalDirHandle = null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectScannedFile = (file: File) => {
    onFileSelect(file);
    toast.success("ดึงไฟล์สำเร็จ");
  };

  // Polling Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isOpen && dirHandle && isWatching && watchStartTime) {
      interval = setInterval(async () => {
        try {
          const files = await getFilesInDir(dirHandle);
          
          // Detect if a NEW file was added AFTER we started watching
          // We add a 500ms buffer in case of slight time differences
          const newFile = files.find(f => f.lastModified > watchStartTime + 500);
          
          if (newFile) {
            clearInterval(interval);
            setIsWatching(false);
            handleSelectScannedFile(newFile.file);
          } else {
            // Just update the list so the user sees existing files
            setScannedFiles(files);
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 1500); // Check every 1.5 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, dirHandle, isWatching, watchStartTime]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex flex-col items-center justify-center z-[70] p-4">
      <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 dark:border-slate-600 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-lg">
            <Inbox className="text-blue-600 dark:text-blue-400" />
            ดึงไฟล์จากเครื่องสแกน (Agentless)
          </h3>
          <div className="flex items-center gap-2">
            {dirHandle && (
              <button
                onClick={() => loadFiles(dirHandle)}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                title="รีเฟรช"
              >
                <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-800/50">
          {!isBrowserSupported ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
              <h4 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">
                เบราว์เซอร์ของคุณไม่รองรับฟีเจอร์นี้
              </h4>
              <p className="text-red-600 dark:text-red-300 text-sm">
                ฟีเจอร์นี้ต้องใช้ File System Access API กรุณาใช้งานผ่านเบราว์เซอร์ Google Chrome, Microsoft Edge หรือ Opera ครับ
              </p>
            </div>
          ) : !dirHandle ? (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center shadow-sm">
              <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-500">
                <FolderSearch size={40} />
              </div>
              <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-3">
                เชื่อมต่อโฟลเดอร์สแกน
              </h4>
              <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
                เพื่อความปลอดภัย เบราว์เซอร์จำเป็นต้องขออนุญาตเพื่อเฝ้าดูโฟลเดอร์ที่คุณใช้เก็บไฟล์สแกน (ทำเพียง 1 ครั้งต่อการเปิดเว็บ)
              </p>
              <button
                onClick={requestDirectoryAccess}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2 mx-auto"
              >
                <FolderSearch size={20} />
                อนุญาตและเลือกโฟลเดอร์
              </button>
            </div>
          ) : (
            <>
              {isWatching && (
                <div className="mb-6 bg-blue-50 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-800 rounded-xl p-6 text-center shadow-sm">
                  <div className="flex justify-center mb-4 relative">
                    <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-20"></div>
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300 relative z-10">
                      <Inbox size={32} className="animate-pulse" />
                    </div>
                  </div>
                  <h4 className="text-lg font-bold text-blue-800 dark:text-blue-300 mb-2">
                    เชื่อมต่อแล้ว! กำลังรอรับไฟล์...
                  </h4>
                  <p className="text-blue-600 dark:text-blue-400 text-sm">
                    คุณสามารถสแกนเอกสารได้เลย ทันทีที่ไฟล์เข้าโฟลเดอร์ ระบบจะดึงเข้ามาโดยอัตโนมัติ
                  </p>
                  <button 
                    onClick={() => {
                      setDirHandle(null);
                      globalDirHandle = null;
                      setIsWatching(false);
                    }}
                    className="mt-4 text-xs text-blue-500 hover:underline"
                  >
                    เปลี่ยนโฟลเดอร์สแกน
                  </button>
                </div>
              )}

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <RefreshCw size={32} className="animate-spin mb-4 text-blue-500" />
                  <p>กำลังอ่านไฟล์ในโฟลเดอร์...</p>
                </div>
              ) : scannedFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <Inbox size={48} className="mb-4 text-slate-300 dark:text-slate-600" />
                  <p>ไม่พบไฟล์ในโฟลเดอร์นี้</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">หรือเลือกไฟล์ที่มีอยู่แล้ว</h4>
                    <span className="text-xs text-slate-500">{scannedFiles.length} ไฟล์</span>
                  </div>
                  
                  {scannedFiles.map((f, i) => (
                    <div 
                      key={i} 
                      className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between hover:border-blue-300 dark:hover:border-blue-600 transition-colors group cursor-pointer"
                      onClick={() => handleSelectScannedFile(f.file)}
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
                            <span>{new Date(f.lastModified).toLocaleString('th-TH')}</span>
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

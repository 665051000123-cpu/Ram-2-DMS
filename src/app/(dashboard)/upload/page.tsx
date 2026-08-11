"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { UploadCloud, FileText, X, AlertCircle, Camera, Calendar, ChevronDown, Inbox, RefreshCw, FileImage, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import CameraCapture from "@/components/CameraCapture";
import ScannerSelectionModal from "@/components/ScannerSelectionModal";

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<{file: File, title: string, documentType: string}[]>([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [folderId, setFolderId] = useState("");
  const [documentCode, setDocumentCode] = useState("");
  const [retentionPeriod, setRetentionPeriod] = useState("");
  const [folders, setFolders] = useState<any[]>([]);

  const [savedTags, setSavedTags] = useState<string[]>([]);
  const [showSavedTags, setShowSavedTags] = useState(false);

  // Saved Document Types State
  const [savedDocTypes, setSavedDocTypes] = useState<string[]>([
    "แบบฟอร์ม",
    "ประกาศ",
    "แนวทางปฏิบัติ",
    "ระเบียบการ",
    "อื่นๆ",
  ]);
  const [isDocTypeOpen, setIsDocTypeOpen] = useState(false);
  const docTypeRef = useRef<HTMLDivElement>(null);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const tagRef = useRef<HTMLDivElement>(null);
  
  const [redirectAfterUpload, setRedirectAfterUpload] = useState(true);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scannedFiles, setScannedFiles] = useState<any[]>([]);
  const [isLoadingScanned, setIsLoadingScanned] = useState(false);
  const [scannedFilePath, setScannedFilePath] = useState<string | null>(null);

  const handleScannerFileSelect = (newFile: File) => {
    setScannedFilePath(newFile.name); // Using name as path just for validation logic
    validateAndSetFile(newFile);
    setShowScannerModal(false);
  };

  const getFolderDisplayName = (folder: any, allFolders: any[]) => {
    let path = folder.name;
    let currentParentId = folder.parentId;
    let depth = 0;
    while(currentParentId && depth < 10) {
       const parent = allFolders.find((f: any) => f.id === currentParentId);
       if (parent) {
          path = parent.name + " / " + path;
          currentParentId = parent.parentId;
       } else {
          if (folder.parent?.name && path === folder.name) {
             path = folder.parent.name + " / " + path;
          }
          break;
       }
       depth++;
    }
    const deptSuffix = folder.department ? ` (ส่วนกลาง: ${folder.department.name})` : '';
    return path + deptSuffix;
  };

  const sortedFolders = useMemo(() => {
    if (!folders) return [];
    const mapped = folders.map(f => ({
      ...f,
      displayName: getFolderDisplayName(f, folders)
    }));
    return mapped.sort((a, b) => a.displayName.localeCompare(b.displayName, 'th'));
  }, [folders]);

  // Load saved tags and preferences on mount
  useEffect(() => {
    const loadedTags = localStorage.getItem("dms_saved_tags");
    if (loadedTags) {
      setSavedTags(JSON.parse(loadedTags));
    }

    const loadedDocTypes = localStorage.getItem("dms_saved_doctypes");
    if (loadedDocTypes) {
      setSavedDocTypes(JSON.parse(loadedDocTypes));
    }
    
    const savedRedirect = localStorage.getItem("dms_redirect_after_upload");
    if (savedRedirect !== null) {
      setRedirectAfterUpload(savedRedirect === "true");
    }

    // Fetch folders
    const fetchFolders = async () => {
      try {
        const res = await fetch("/api/folders?myDeptOnly=true");
        if (res.ok) {
          const data = await res.json();
          setFolders(data.folders || []);
          if (data.folders && data.folders.length > 0) {
            setFolderId(data.folders[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch folders", err);
      }
    };
    fetchFolders();
  }, []);

  const handleAddTagFromInput = (e?: React.KeyboardEvent<HTMLInputElement>) => {
    if (e && e.key !== "Enter") return;
    if (e) e.preventDefault();
    
    if (!tagInput.trim()) return;
    
    const newTag = tagInput.trim();
    const currentTags = tags.split(",").map(t => t.trim()).filter(Boolean);
    
    if (!currentTags.includes(newTag)) {
      setTags([...currentTags, newTag].join(", "));
    }
    
    if (!savedTags.includes(newTag)) {
      const updatedSaved = [...savedTags, newTag];
      setSavedTags(updatedSaved);
      localStorage.setItem("dms_saved_tags", JSON.stringify(updatedSaved));
    }
    
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = tags.split(",").map(t => t.trim()).filter(Boolean);
    setTags(currentTags.filter(t => t !== tagToRemove).join(", "));
  };

  const handleToggleSavedTag = (tag: string) => {
    const currentTags = tags.split(",").map(t => t.trim()).filter(Boolean);
    if (currentTags.includes(tag)) {
      setTags(currentTags.filter(t => t !== tag).join(", "));
    } else {
      setTags([...currentTags, tag].join(", "));
    }
  };

  const handleSaveDocType = () => {
    if (!documentType.trim()) return;
    const newType = documentType.trim();
    if (!savedDocTypes.includes(newType)) {
      const updatedTypes = [...savedDocTypes, newType];
      setSavedDocTypes(updatedTypes);
      localStorage.setItem("dms_saved_doctypes", JSON.stringify(updatedTypes));
      toast.success("บันทึกประเภทเอกสารใหม่เรียบร้อยแล้ว");
    } else {
      toast.success("มีประเภทเอกสารนี้อยู่แล้ว");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setScannedFilePath(null);
      Array.from(e.dataTransfer.files).forEach(f => validateAndSetFile(f));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setScannedFilePath(null);
      Array.from(e.target.files).forEach(f => validateAndSetFile(f));
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    // กำหนดให้รับเฉพาะ PDF และรูปภาพ
    const validTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error(`ไฟล์ ${selectedFile.name} ไม่รองรับ (เฉพาะ PDF, JPG, PNG)`);
      return;
    }

    // จำกัดขนาด 10MB
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error(`ไฟล์ ${selectedFile.name} มีขนาดเกิน 10MB`);
      return;
    }

    setFiles(prev => {
      const newFileObj = { file: selectedFile, title: selectedFile.name.split(".")[0], documentType: "" };
      // If not bulk mode, replace the file
      if (!isBulkMode) return [newFileObj];
      
      // If bulk mode, check if already exists
      const exists = prev.some(f => f.file.name === selectedFile.name && f.file.size === selectedFile.size);
      if (exists) return prev;
      return [...prev, newFileObj];
    });

    // หากผู้ใช้ยังไม่ได้ตั้งชื่อ และไม่ใช่โหมด bulk ให้ใช้ชื่อไฟล์เป็นค่าเริ่มต้น
    if (!title && !isBulkMode) {
      setTitle(selectedFile.name.split(".")[0]);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (files.length === 0) {
      toast.error("กรุณาเลือกไฟล์ก่อนอัปโหลด");
      return;
    }

    if (!folderId) {
      toast.error("กรุณาเลือกแฟ้มปลายทาง");
      return;
    }

    setIsUploading(true);
    setUploadProgress({ current: 0, total: files.length });

    try {
      let successCount = 0;

      for (let i = 0; i < files.length; i++) {
        const uploadObj = files[i];
        const fileToUpload = uploadObj.file;
        
        // In bulk mode, check per-file metadata first
        const finalTitle = isBulkMode && uploadObj.title ? uploadObj.title : (isBulkMode || !title ? fileToUpload.name.split(".")[0] : title);
        const finalDocType = isBulkMode && uploadObj.documentType ? uploadObj.documentType : documentType;
        
        const formData = new FormData();
        formData.append("file", fileToUpload);
        formData.append("title", finalTitle);
        formData.append("description", description);
        formData.append("tags", tags);
        formData.append("documentType", finalDocType);
        formData.append("folderId", folderId);
        
        // In bulk mode, we probably shouldn't use the exact same documentCode if it's supposed to be unique
        // We'll append a number if bulk
        const finalCode = isBulkMode && documentCode ? `${documentCode}-${i+1}` : documentCode;
        formData.append("documentCode", finalCode);
        formData.append("retentionPeriod", retentionPeriod);
        
        // Scanned file path only applies if it's a single file and we have the path, 
        // but for bulk we'll just upload the blob directly as a normal file.
        if (scannedFilePath && files.length === 1) {
          formData.append("scannedFilePath", scannedFilePath);
        }

        const res = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          toast.error(`อัปโหลดไฟล์ ${fileToUpload.name} ไม่สำเร็จ`);
          continue; // Continue with next file
        }
        
        successCount++;
        setUploadProgress({ current: i + 1, total: files.length });
      }

      if (successCount === 0) {
        throw new Error("Upload failed for all files");
      }

      if (successCount === files.length) {
        toast.success(`อัปโหลดสำเร็จทั้งหมด ${successCount} ไฟล์!`);
      } else {
        toast.success(`อัปโหลดสำเร็จ ${successCount} จาก ${files.length} ไฟล์`);
      }

      if (redirectAfterUpload) {
        router.push(`/documents?folderId=${folderId}`);
      } else {
        // Reset form
        setFiles([]);
        setPreviewUrl(null);
        setTitle("");
        setDescription("");
        setTags("");
        setTagInput("");
        setDocumentType("");
        setDocumentCode("");
        setRetentionPeriod("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error(error);
      toast.error("เกิดข้อผิดพลาดในการอัปโหลดไฟล์");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          อัปโหลดเอกสารใหม่
        </h1>
        <p className="text-slate-500 dark:text-white mt-1">
          นำเข้าเอกสารที่สแกนจากเครื่องปริ้น หรือไฟล์อิเล็กทรอนิกส์เข้าระบบ
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 1. File Upload Area */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-slate-700 dark:text-white">
                  1. เลือกไฟล์เอกสาร
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">อัปโหลดหลายไฟล์ (Bulk)</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={isBulkMode}
                      onChange={(e) => {
                        setIsBulkMode(e.target.checked);
                        if (!e.target.checked && files.length > 1) {
                          setFiles([files[0]]);
                        }
                      }}
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {files.length === 0 ? (
                <div
                  className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
                    isDragging
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-500/20"
                      : "border-slate-300 dark:border-slate-600 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple={isBulkMode}
                    onChange={handleFileChange}
                  />
                  <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-blue-300">
                    <UploadCloud size={32} />
                  </div>
                  <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-1">
                    ลากไฟล์มาวางที่นี่ หรือ คลิกเพื่อเลือกไฟล์
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-white mb-4">
                    รองรับไฟล์ PDF, JPG, PNG (สูงสุด 10MB)
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="button"
                      className="px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white font-medium rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all duration-200"
                    >
                      ค้นหาไฟล์ในเครื่อง
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowScannerModal(true);
                      }}
                      className="px-5 py-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-medium rounded-lg shadow-sm hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all duration-200 border border-blue-200 dark:border-blue-800 flex items-center gap-2"
                    >
                      <Inbox size={18} />
                      ดึงจากเครื่องสแกน
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-end mb-2">
                     {isBulkMode && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                        >
                          + เพิ่มไฟล์อื่น
                        </button>
                     )}
                  </div>
                  {files.map((item, idx) => (
                    <div key={idx} className="border border-blue-200 bg-blue-50 dark:bg-blue-500/20/50 rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white dark:bg-slate-900 transition-colors rounded-lg shadow-sm flex items-center justify-center text-blue-600 dark:text-blue-300">
                            <FileText size={24} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-white">
                              {item.file.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-white">
                              {(item.file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="p-2 text-slate-400 dark:text-white hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-lg transition"
                        >
                          <X size={20} />
                        </button>
                      </div>
                      
                      {isBulkMode && (
                        <div className="grid grid-cols-2 gap-3 mt-2 pt-3 border-t border-blue-200/50 dark:border-blue-500/20">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                              ประเภทเอกสาร (ระบุแยกรายไฟล์)
                            </label>
                            <input
                              type="text"
                              value={item.documentType}
                              onChange={(e) => {
                                const newFiles = [...files];
                                newFiles[idx].documentType = e.target.value;
                                setFiles(newFiles);
                              }}
                              className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:border-blue-500"
                              placeholder="เว้นว่างเพื่อใช้หมวดหมู่ด้านล่าง..."
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                              ชื่อเอกสาร (ระบุแยกรายไฟล์)
                            </label>
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => {
                                const newFiles = [...files];
                                newFiles[idx].title = e.target.value;
                                setFiles(newFiles);
                              }}
                              className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:border-blue-500"
                              placeholder="เว้นว่างเพื่อใช้ชื่อไฟล์..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Document Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4 md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-white">
                  2. รายละเอียดเอกสาร
                </label>
              </div>

              {(!isBulkMode && files.length <= 1) && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1.5">
                    ชื่อเอกสาร <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    placeholder="เช่น ใบส่งตัวคนไข้, รายงานการประชุมเดือนสิงหาคม"
                    required={!isBulkMode}
                  />
                </div>
              )}

              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1.5">
                  รหัสเอกสาร (เว้นว่างเพื่อให้ระบบสร้างให้อัตโนมัติ)
                </label>
                <input
                  type="text"
                  value={documentCode}
                  onChange={(e) => setDocumentCode(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  placeholder="เช่น HR-2024-001"
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1.5">
                  วันที่หมดอายุ / อายุการจัดเก็บ
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    readOnly
                    value={retentionPeriod ? format(new Date(retentionPeriod), "dd/MM/yyyy") : ""}
                    placeholder="วว/ดด/ปปปป"
                    className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all cursor-pointer"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-slate-400 dark:text-white" />
                  </div>
                  <input
                    type="date"
                    value={retentionPeriod}
                    onChange={(e) => setRetentionPeriod(e.target.value)}
                    onClick={(e) => {
                      try {
                        if ('showPicker' in HTMLInputElement.prototype) {
                          e.currentTarget.showPicker();
                        }
                      } catch (err) {}
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1.5">
                  รายละเอียดเพิ่มเติม (ถ้ามี)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  placeholder="เพิ่มข้อมูลที่ช่วยให้อธิบายเอกสารได้ดีขึ้น"
                  rows={3}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1.5">
                  ประเภทเอกสาร
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1" ref={docTypeRef}>
                    <input
                      value={documentType}
                      onChange={(e) => {
                        setDocumentType(e.target.value);
                        setIsDocTypeOpen(true);
                      }}
                      onFocus={() => setIsDocTypeOpen(true)}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all pr-10"
                      placeholder="เลือกหรือพิมพ์ประเภทเอกสารใหม่..."
                    />
                    <button
                      type="button"
                      onClick={() => setIsDocTypeOpen(!isDocTypeOpen)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <ChevronDown size={20} />
                    </button>

                    {isDocTypeOpen && savedDocTypes && savedDocTypes.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-60 overflow-y-auto py-1">
                        {savedDocTypes.map((type, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setDocumentType(type);
                              setIsDocTypeOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveDocType}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors dark:bg-slate-700 transition-colors text-slate-700 dark:text-white text-sm font-medium rounded-xl transition whitespace-nowrap shrink-0"
                  >
                    บันทึกประเภท
                  </button>
                </div>
              </div>

              <div className="md:col-span-2 relative" ref={tagRef}>
                <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1.5 flex justify-between items-center">
                  <span>คำค้นหา (Tags)</span>
                </label>

                <div className="w-full bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500 transition-all p-2 pr-10 flex flex-wrap gap-2 items-center relative">
                  {(tags || "").split(",").map(t => t.trim()).filter(Boolean).map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-lg"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:bg-blue-200 dark:hover:bg-blue-500/40 rounded-full p-0.5 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => {
                      setTagInput(e.target.value);
                      setIsTagDropdownOpen(true);
                    }}
                    onFocus={() => setIsTagDropdownOpen(true)}
                    onKeyDown={handleAddTagFromInput}
                    className="flex-1 min-w-[150px] bg-transparent outline-none text-slate-700 dark:text-white text-sm px-1 py-1"
                    placeholder={tags ? "เพิ่ม Tag..." : "พิมพ์และกด Enter เพื่อเพิ่ม..."}
                  />
                  
                  {savedTags.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <ChevronDown size={20} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleAddTagFromInput()}
                    className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-white text-xs font-medium rounded-lg whitespace-nowrap shrink-0 ml-auto"
                  >
                    เพิ่ม
                  </button>
                </div>
                
                {isTagDropdownOpen && savedTags.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-60 overflow-y-auto py-1">
                    {savedTags.map((t, idx) => {
                      const isSelected = (tags || "").split(",").map(tg => tg.trim()).filter(Boolean).includes(t);
                      if (isSelected) return null;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            handleToggleSavedTag(t);
                            setIsTagDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1.5">
                  เลือกแฟ้มปลายทาง <span className="text-red-500">*</span>
                </label>
                <select
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  required
                >
                  <option value="" disabled>-- เลือกแฟ้ม --</option>
                  {sortedFolders.map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.displayName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-500/20 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle
                className="text-amber-500 shrink-0 mt-0.5"
                size={20}
              />
              <p className="text-sm text-amber-800">
                เอกสารจะถูกอัปโหลดและจัดเก็บไว้ในแฟ้มที่คุณเลือก
                และจะถูกบันทึกประวัติว่าคุณเป็นผู้อัปโหลด
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100 dark:border-slate-600">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={redirectAfterUpload}
                  onChange={(e) => {
                    setRedirectAfterUpload(e.target.checked);
                    localStorage.setItem("dms_redirect_after_upload", e.target.checked.toString());
                  }}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  ไปที่หน้าแฟ้มจัดเก็บทันทีเมื่ออัปโหลดเสร็จ
                </span>
              </label>
              
              <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
                  <button 
                    type="button"
                    onClick={() => setShowScannerModal(true)}
                    className="px-6 py-2.5 text-slate-600 dark:text-white font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors dark:bg-slate-800 rounded-xl transition"
                  >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isUploading || files.length === 0}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-xl shadow-sm transition flex items-center gap-2 shrink-0"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      กำลังอัปโหลด ({uploadProgress.current}/{uploadProgress.total})...
                    </>
                  ) : (
                    <>
                      <UploadCloud size={20} />
                      {files.length > 1 ? `อัปโหลด ${files.length} ไฟล์` : "อัปโหลดเอกสาร"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      
      {isScanning && (
        <CameraCapture 
          onCapture={(scannedFile) => {
            setScannedFilePath(null);
            validateAndSetFile(scannedFile);
            setIsScanning(false);
          }}
          onCancel={() => setIsScanning(false)}
        />
      )}

      <ScannerSelectionModal 
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onFileSelect={handleScannerFileSelect}
      />
    </div>
  );
}

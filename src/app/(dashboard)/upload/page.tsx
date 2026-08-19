"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { UploadCloud, FileText, X, AlertCircle, ChevronDown, Inbox, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import CameraCapture from "@/components/CameraCapture";
import ScannerSelectionModal from "@/components/ScannerSelectionModal";
import ConfirmModal from "@/components/ConfirmModal";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<{ file: File, title: string }[]>([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState({ isOpen: false });
  const [maxFileSizeMB, setMaxFileSizeMB] = useState(10);
  const [allowedFileTypesStr, setAllowedFileTypesStr] = useState("pdf, jpg, png, jpeg, docx, xlsx");

  // Form State
  const [title, setTitle] = useState("");
  const [documentTypeId, setDocumentTypeId] = useState("");
  const [docTypes, setDocTypes] = useState<any[]>([]);
  const [customFieldsData, setCustomFieldsData] = useState<Record<string, any>>({});
  const [folderId, setFolderId] = useState("");
  const [folders, setFolders] = useState<any[]>([]);
  const [retentionPeriod, setRetentionPeriod] = useState<Date | null>(null);
  const [hasNoExpiry, setHasNoExpiry] = useState(true);

  // Visibility State
  const [visibility, setVisibility] = useState("PRIVATE");
  const [sharedDepartments, setSharedDepartments] = useState<string[]>([]);
  const [allDepartments, setAllDepartments] = useState<any[]>([]);

  const [redirectAfterUpload, setRedirectAfterUpload] = useState(true);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scannedFilePath, setScannedFilePath] = useState<string | null>(null);

  // Custom Dropdown State for Document Type
  const [isDocTypeOpen, setIsDocTypeOpen] = useState(false);
  const [docTypeSearch, setDocTypeSearch] = useState("");
  const docTypeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (docTypeDropdownRef.current && !docTypeDropdownRef.current.contains(event.target as Node)) {
        setIsDocTypeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredDocTypes = useMemo(() => {
    return docTypes.filter(t => t.name.toLowerCase().includes(docTypeSearch.toLowerCase()));
  }, [docTypes, docTypeSearch]);

  const handleScannerFileSelect = (newFile: File) => {
    setScannedFilePath(newFile.name); // Using name as path just for validation logic
    validateAndSetFile(newFile);
    setShowScannerModal(false);
  };

  const getFolderDisplayName = (folder: any, allFolders: any[]) => {
    let path = folder.name;
    let currentParentId = folder.parentId;
    let depth = 0;
    while (currentParentId && depth < 10) {
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
    return path;
  };

  const groupedFolders = useMemo(() => {
    if (!folders) return {};
    const groups: Record<string, any[]> = {};

    folders.forEach(f => {
      const deptName = f.department?.name || 'อื่นๆ (ไม่ระบุแผนก)';
      if (!groups[deptName]) groups[deptName] = [];
      groups[deptName].push({
        ...f,
        displayName: getFolderDisplayName(f, folders)
      });
    });

    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => a.displayName.localeCompare(b.displayName, 'th'));
    });

    return groups;
  }, [folders]);

  // Load saved preferences on mount
  useEffect(() => {

    
    const savedRedirect = localStorage.getItem("dms_redirect_after_upload");
    if (savedRedirect !== null) {
      setRedirectAfterUpload(savedRedirect === "true");
    }

    // Fetch folders and settings
    const fetchData = async () => {
      try {
        const [resDocTypes, resFolders, resSettings, resDepts] = await Promise.all([
          fetch("/api/document-types"),
          fetch("/api/folders?myDeptOnly=true"),
          fetch("/api/settings/public"),
          fetch("/api/departments")
        ]);

        if (resDocTypes.ok) {
          const docTypeData = await resDocTypes.json();
          setDocTypes(docTypeData.documentTypes || []);
        }
        if (resFolders.ok) {
          const contentType = resFolders.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await resFolders.json();
            setFolders(data.folders || []);
            if (data.folders && data.folders.length > 0) {
              setFolderId(data.folders[0].id);
            }
          }
        }

        if (resSettings.ok) {
          const contentType = resSettings.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await resSettings.json();
            setMaxFileSizeMB(data.maxFileSizeMB || 10);
            if (data.allowedFileTypes) setAllowedFileTypesStr(data.allowedFileTypes);
          }
        }

        if (resDepts.ok) {
          const data = await resDepts.json();
          setAllDepartments(Array.isArray(data) ? data : (data.departments || []));
        }
      } catch (err) {
        console.error("Failed to fetch data", err);
      }
    };
    fetchData();
  }, []);



  
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

    // ตรวจสอบขนาดไฟล์
    if (selectedFile.size > maxFileSizeMB * 1024 * 1024) {
      toast.error(`ไฟล์ ${selectedFile.name} มีขนาดใหญ่เกิน ${maxFileSizeMB}MB`);
      return;
    }

    setFiles(prev => {
      const newFileObj = { file: selectedFile, title: selectedFile.name.split(".")[0],  };
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (files.length === 0) {
      toast.error("กรุณาเลือกไฟล์ที่ต้องการอัปโหลด");
      return;
    }

    

    setConfirmModal({ isOpen: true });
  };

  const executeUpload = async () => {
    setConfirmModal({ isOpen: false });
    setIsUploading(true);
    setUploadProgress({ current: 0, total: files.length });

    try {
      let successCount = 0;

      for (let i = 0; i < files.length; i++) {
        const uploadObj = files[i];
        const fileToUpload = uploadObj.file;

        // In bulk mode, check per-file metadata first
        const finalTitle = isBulkMode && uploadObj.title ? uploadObj.title : (isBulkMode || !title ? fileToUpload.name.split(".")[0] : title);
        

        const formData = new FormData();
        formData.append("file", fileToUpload);
        formData.append("title", finalTitle);
        formData.append("tags", ""); // Keep empty string for schema compatibility
        if (documentTypeId) formData.append("documentTypeId", documentTypeId);
        formData.append("customFields", JSON.stringify(customFieldsData));
        formData.append("visibility", visibility);
        formData.append("sharedDepartments", JSON.stringify(sharedDepartments));
        if (retentionPeriod) formData.append("retentionPeriod", retentionPeriod.toISOString());

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
        router.push(`/documents`);
      } else {
        // Reset form
        setFiles([]);
        setPreviewUrl(null);
        setTitle("");
        setDocumentTypeId("");
        setCustomFieldsData({});
        setVisibility("PRIVATE");
        setSharedDepartments([]);
        setRetentionPeriod(null);
        setHasNoExpiry(true);
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

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple={isBulkMode}
                onChange={handleFileChange}
              />

              {files.length === 0 ? (
                <div
                  className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${isDragging
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-500/20"
                      : "border-slate-300 dark:border-slate-600 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                    }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
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
                      ดึงจากเครื่องสแกน <span className="text-xs font-normal opacity-75">(อยู่ระหว่างพัฒนาปรับปรุง)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-end mb-2">
                    {isBulkMode && (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium flex items-center gap-1"
                        >
                          + เพิ่มไฟล์จากเครื่อง
                        </button>
                        <span className="text-slate-300 dark:text-slate-600">|</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowScannerModal(true);
                          }}
                          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium flex items-center gap-1"
                        >
                          <Inbox size={14} /> ดึงจากเครื่องสแกน <span className="text-[10px] font-normal opacity-75">(อยู่ระหว่างพัฒนาปรับปรุง)</span>
                        </button>
                      </div>
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

              <div className="md:col-span-2" ref={docTypeDropdownRef}>
                <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1.5">
                  ประเภทเอกสาร (Document Type)
                </label>
                <div className="relative">
                  <div
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white cursor-pointer flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                    onClick={() => setIsDocTypeOpen(!isDocTypeOpen)}
                  >
                    <span className={documentTypeId ? "" : "text-slate-500"}>
                      {documentTypeId ? docTypes.find(t => t.id === documentTypeId)?.name : "-- ไม่ระบุประเภท (เอกสารทั่วไป) --"}
                    </span>
                    <ChevronDown size={18} className="text-slate-400" />
                  </div>

                  {isDocTypeOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      <div className="p-2 sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 z-20">
                        <input
                          type="text"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 text-slate-700 dark:text-white"
                          placeholder="ค้นหาประเภทเอกสาร..."
                          value={docTypeSearch}
                          onChange={(e) => setDocTypeSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                      </div>
                      <div
                        className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-sm text-slate-700 dark:text-slate-300"
                        onClick={() => {
                          setDocumentTypeId("");
                          setCustomFieldsData({});
                          setIsDocTypeOpen(false);
                          setDocTypeSearch("");
                        }}
                      >
                        -- ไม่ระบุประเภท (เอกสารทั่วไป) --
                      </div>
                      {filteredDocTypes.map((type) => (
                        <div
                          key={type.id}
                          className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-sm text-slate-700 dark:text-slate-300"
                          onClick={() => {
                            setDocumentTypeId(type.id);
                            
                            const defaultFields: Record<string, any> = {};
                            if (type.schema) {
                              type.schema.forEach((f: any) => {
                                if (f.defaultValue) {
                                  defaultFields[f.name] = f.defaultValue;
                                }
                              });
                            }
                            setCustomFieldsData(defaultFields);
                            setIsDocTypeOpen(false);
                            setDocTypeSearch("");
                          }}
                        >
                          {type.name}
                        </div>
                      ))}
                      {filteredDocTypes.length === 0 && (
                        <div className="px-4 py-3 text-sm text-slate-500 text-center">
                          ไม่พบประเภทเอกสารที่ค้นหา
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-white">
                    วันหมดอายุของเอกสาร <span className="text-red-500">*</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasNoExpiry}
                      onChange={(e) => {
                        setHasNoExpiry(e.target.checked);
                        if (e.target.checked) setRetentionPeriod(null);
                      }}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">ไม่มีวันหมดอายุ</span>
                  </label>
                </div>
                <DatePicker
                  selected={retentionPeriod}
                  onChange={(date: Date | null) => setRetentionPeriod(date)}
                  dateFormat="dd/MM/yyyy"
                  disabled={hasNoExpiry}
                  required={!hasNoExpiry}
                  placeholderText="DD/MM/YYYY"
                  className={`w-full px-4 py-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all ${hasNoExpiry ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : 'cursor-pointer'}`}
                  wrapperClassName="w-full block"
                />
              </div>

              {/* Dynamic Custom Fields */}
              {documentTypeId && docTypes.find(t => t.id === documentTypeId)?.schema?.map((field: any, idx: number) => (
                <div key={idx} className="md:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1.5">
                    {field.label || field.name} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      required={field.required}
                      placeholder={field.placeholder || ""}
                      value={customFieldsData[field.name] || ''}
                      onChange={(e) => setCustomFieldsData({ ...customFieldsData, [field.name]: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                      rows={3}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      required={field.required}
                      value={customFieldsData[field.name] || ''}
                      onChange={(e) => setCustomFieldsData({ ...customFieldsData, [field.name]: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    >
                      <option value="" disabled>-- เลือกข้อมูล --</option>
                      {field.options?.split(',').map((opt: string) => opt.trim()).filter(Boolean).map((opt: string, idx: number) => (
                        <option key={idx} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : field.type === 'radio' ? (
                    <div className="flex flex-wrap gap-4 mt-2">
                      {field.options?.split(',').map((opt: string) => opt.trim()).filter(Boolean).map((opt: string, optIdx: number) => (
                        <label key={optIdx} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`field_${field.name}_${idx}`}
                            required={field.required && !customFieldsData[field.name]}
                            checked={customFieldsData[field.name] === opt}
                            onChange={(e) => {
                              if (e.target.checked) setCustomFieldsData({ ...customFieldsData, [field.name]: opt })
                            }}
                            className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-300">{opt}</span>
                        </label>
                      ))}
                    </div>
                  ) : field.type === 'checkbox' ? (
                    <div className="flex items-center h-[42px]">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          required={field.required}
                          checked={!!customFieldsData[field.name]}
                          onChange={(e) => setCustomFieldsData({ ...customFieldsData, [field.name]: e.target.checked })}
                          className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">{field.placeholder || "ใช่ / ตกลง"}</span>
                      </label>
                    </div>
                  ) : (
                    <input
                      type={field.type}
                      required={field.required}
                      placeholder={field.placeholder || ""}
                      value={customFieldsData[field.name] || ''}
                      onChange={(e) => setCustomFieldsData({ ...customFieldsData, [field.name]: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    />
                  )}
                  {field.description && (
                    <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{field.description}</p>
                  )}
                </div>
              ))}
              


              

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1.5">
                  สิทธิ์การมองเห็น (Visibility)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition-colors ${visibility === 'PRIVATE' ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'}`}>
                    <input type="radio" name="visibility" value="PRIVATE" checked={visibility === 'PRIVATE'} onChange={() => setVisibility('PRIVATE')} className="hidden" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">ส่วนตัวแผนก (Private)</span>
                      <span className="text-xs opacity-70">เห็นได้เฉพาะคนในแผนก</span>
                    </div>
                  </label>
                  <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition-colors ${visibility === 'PUBLIC' ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'}`}>
                    <input type="radio" name="visibility" value="PUBLIC" checked={visibility === 'PUBLIC'} onChange={() => setVisibility('PUBLIC')} className="hidden" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">สาธารณะ (Public)</span>
                      <span className="text-xs opacity-70">ทุกคนในบริษัทเห็นได้</span>
                    </div>
                  </label>
                  <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition-colors ${visibility === 'CUSTOM' ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'}`}>
                    <input type="radio" name="visibility" value="CUSTOM" checked={visibility === 'CUSTOM'} onChange={() => setVisibility('CUSTOM')} className="hidden" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">แชร์แผนกอื่น (Custom)</span>
                      <span className="text-xs opacity-70">เลือกแผนกที่จะให้เห็นได้</span>
                    </div>
                  </label>
                </div>
                
                {visibility === 'CUSTOM' && (
                  <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 mt-2">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">เลือกแผนกที่คุณต้องการแชร์ไฟล์นี้ให้เห็น:</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {allDepartments.map(dept => (
                        <label key={dept.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sharedDepartments.includes(dept.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSharedDepartments([...sharedDepartments, dept.id]);
                              } else {
                                setSharedDepartments(sharedDepartments.filter(id => id !== dept.id));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300"
                          />
                          <span className="text-sm text-slate-600 dark:text-slate-400">{dept.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
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

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="ยืนยันการอัปโหลด"
        message={`คุณต้องการอัปโหลดเอกสารทั้งหมด ${files.length} รายการ ใช่หรือไม่?`}
        onConfirm={executeUpload}
        onCancel={() => setConfirmModal({ isOpen: false })}
      />

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


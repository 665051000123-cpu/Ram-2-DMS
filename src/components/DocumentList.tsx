"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Search,
  FileText,
  Download,
  Eye,
  Calendar,
  Tag,
  Trash2,
  Filter,
  Edit,
  Star,
  CheckCircle,
  XCircle,
  Folder,
  LayoutGrid,
  List,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Building2,
  Shield,
  Link,
  Unlink,
  MessageSquare,
  Inbox,
} from "lucide-react";
import { format, isToday, isThisWeek, isThisMonth } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import ConfirmModal from "./ConfirmModal";
import ScannerSelectionModal from "./ScannerSelectionModal";
import FolderAccessModal from "./FolderAccessModal";
import DocumentLinkModal from "./DocumentLinkModal";
import DocumentCommentModal from "./DocumentCommentModal";
import { usePermissions } from "@/hooks/usePermissions";

type Document = {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileType: string;
  tags: string;
  documentCode?: string | null;
  retentionPeriod?: Date | null;
  isExpired?: boolean;
  departmentId?: string;
  department?: { id: string, name: string };
  currentVersion?: number;
  documentType?: string | null;
  documentTypeId?: string | null;
  customFields?: any;
  documentTypeRef?: { id: string; name: string; schema: any[] } | null;
  fileSize?: number;
  favoritedBy?: { userId: string }[];
  versions?: {
    id: string;
    version: number;
    fileUrl: string;
    fileType: string;
    createdAt: Date;
  }[];
  createdAt: Date;
  updatedAt?: Date;
  uploader: {
    name: string;
  };
  folder?: {
    id: string;
    name: string;
  };
};

const formatFileSize = (bytes?: number) => {
  if (bytes === undefined || bytes === null || bytes === 0) return "-";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export default function DocumentList({
  initialDocuments,
  currentUserId,
  currentUserRole,
  currentUserDepartmentId,
  folders = [],
  departments = [],
  documentTypes = [],
}: {
  initialDocuments: Document[];
  currentUserId: string;
  currentUserRole: string;
  currentUserDepartmentId?: string | null;
  folders?: { id: string; name: string; parentId: string | null; description: string | null; departmentId: string | null; }[];
  departments?: { id: string; name: string; }[];
  documentTypes?: { id: string; name: string; schema: any }[];
}) {
  const router = useRouter();
  const { permissions } = usePermissions(currentUserRole);
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);

  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [showEditScannerModal, setShowEditScannerModal] = useState(false);
  const handleEditScannerFileSelect = (newFile: File) => {
    setEditModal(prev => ({ ...prev, file: newFile }));
    setShowEditScannerModal(false);
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterFolder, setFilterFolder] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");

  const selectedDocType = useMemo(() => {
    if (filterType === "ALL") return null;
    return documentTypes.find(t => t.id === filterType);
  }, [filterType, documentTypes]);
  const hasCustomSchema = Boolean(selectedDocType && Array.isArray(selectedDocType.schema) && selectedDocType.schema.length > 0);

  const [deepSearchDocs, setDeepSearchDocs] = useState<string[] | null>(null);
  const [isDeepSearching, setIsDeepSearching] = useState(false);

  const [viewMode, setViewMode] = useState<"folder" | "list">("folder");
  const [currentPath, setCurrentPath] = useState<{ id: string; name: string; type: "department" | "folder" }[]>([]);

  const searchParams = useSearchParams();
  const folderIdParam = searchParams.get('folderId');

  useEffect(() => {
    if (folderIdParam && folders && folders.length > 0 && departments && departments.length > 0) {
      const targetFolder = folders.find(f => f.id === folderIdParam);
      if (targetFolder) {
        const dept = departments.find(d => d.id === targetFolder.departmentId);
        if (dept) {
          const path: { id: string, name: string, type: "department" | "folder" }[] = [{ id: dept.id, name: dept.name, type: "department" }];
          
          if (targetFolder.parentId) {
            const parent = folders.find(f => f.id === targetFolder.parentId);
            if (parent) {
               path.push({ id: parent.id, name: parent.name, type: "folder" });
            }
          }
          
          path.push({ id: targetFolder.id, name: targetFolder.name, type: "folder" });
          setCurrentPath(path);
          setViewMode("folder");
        }
      }
    }
  }, [folderIdParam, folders, departments]);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    docId: string;
    docTitle: string;
  }>({
    isOpen: false,
    docId: "",
    docTitle: "",
  });

  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    docId: string;
    title: string;
    description: string;
    tags: string;
    documentType: string;
    documentCode: string;
    retentionPeriod: string;
    file: File | null;
  }>({
    isOpen: false,
    docId: "",
    title: "",
    description: "",
    tags: "",
    documentType: "",
    documentCode: "",
    retentionPeriod: "",
    file: null,
  });
  const [isEditing, setIsEditing] = useState(false);

  const [viewModal, setViewModal] = useState<{
    isOpen: boolean;
    url: string;
    title: string;
  }>({
    isOpen: false,
    url: "",
    title: "",
  });

  const [historyModal, setHistoryModal] = useState<{
    isOpen: boolean;
    doc: Document | null;
  }>({
    isOpen: false,
    doc: null,
  });

  const [linkModal, setLinkModal] = useState<{
    isOpen: boolean;
    doc: Document | null;
  }>({
    isOpen: false,
    doc: null,
  });

  const [commentModal, setCommentModal] = useState<{
    isOpen: boolean;
    doc: Document | null;
  }>({
    isOpen: false,
    doc: null,
  });

  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const [manageAccessModal, setManageAccessModal] = useState<{
    isOpen: boolean;
    folderId: string;
    folderName: string;
  }>({
    isOpen: false,
    folderId: "",
    folderName: "",
  });



  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setIsCreatingFolder(true);
    try {
      let departmentId = null;
      let parentId = null;

      if (currentPath.length > 0) {
        const firstNode = currentPath[0];
        if (firstNode.type === "department") {
          departmentId = firstNode.id;
        }

        const currentNode = currentPath[currentPath.length - 1];
        if (currentNode.type === "folder") {
          parentId = currentNode.id;
        }
      }

      let res;
      if (currentPath.length === 0) {
        res = await fetch("/api/departments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            name: newFolderName.trim()
          }),
        });
      } else {
        res = await fetch("/api/folders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            name: newFolderName.trim(),
            departmentId,
            parentId
          }),
        });
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create item");
      }

      toast.success(currentPath.length === 0 ? "เพิ่มแผนกใหม่สำเร็จ" : "สร้างแฟ้มย่อยสำเร็จ");
      setShowCreateFolderModal(false);
      setNewFolderName("");
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "เกิดข้อผิดพลาดในการสร้างหมวดหมู่");
    } finally {
      setIsCreatingFolder(false);
    }
  };



  const folderStats = useMemo(() => {
    const folderMap = new Map<string, { id: string, name: string, count: number }>();

    if (folders && folders.length > 0) {
      folders.forEach((f) => {
        folderMap.set(f.id, { id: f.id, name: f.name, count: 0 });
      });
    }

    documents.forEach((doc) => {
      const folderId = doc.folder?.id || "unknown";
      const folderName = doc.folder?.name || "เอกสารทั่วไป (ไม่มีแฟ้ม)";
      if (folderMap.has(folderId)) {
        folderMap.get(folderId)!.count += 1;
      } else {
        folderMap.set(folderId, { id: folderId, name: folderName, count: 1 });
      }
    });

    return Array.from(folderMap.values())
      .sort((a, b) => {
        if (a.id === "unknown") return 1;
        if (b.id === "unknown") return -1;
        return a.name.localeCompare(b.name, "th");
      });
  }, [documents, folders]);

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      // 1. Text Search (Local or Deep Search)
      let matchesSearch = true;
      if (deepSearchDocs !== null) {
        matchesSearch = deepSearchDocs.includes(doc.id);
      } else if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        matchesSearch =
          doc.title.toLowerCase().includes(searchLower) ||
          (doc.description || "").toLowerCase().includes(searchLower) ||
          doc.tags.toLowerCase().includes(searchLower);
      }

      // 2. Date Filter
      let matchesDate = true;
      if (filterDate) {
        const docDate = format(new Date(doc.createdAt), "yyyy-MM-dd");
        matchesDate = docDate === filterDate;
      }

      // 3. Folder Filter
      let matchesFolder = true;
      if (filterFolder !== "ALL") {
        matchesFolder = doc.folder?.id === filterFolder;
      }

      // 4. Type Filter
      let matchesType = true;
      if (filterType !== "ALL") {
        matchesType = doc.documentTypeId === filterType || doc.documentType === filterType;
      }


      return (
        matchesSearch &&
        matchesDate &&
        matchesType &&
        matchesFolder
      );
    });
  }, [
    documents,
    searchTerm,
    filterDate,
    filterFolder,
    filterType,
    currentPath,
    deepSearchDocs,
  ]);

  const handleDeepSearch = async () => {
    if (!searchTerm.trim()) {
      setDeepSearchDocs(null);
      return;
    }
    setIsDeepSearching(true);
    try {
      const res = await fetch(
        `/api/documents/search?q=${encodeURIComponent(searchTerm)}`,
      );
      const data = await res.json();
      if (data.documentIds) {
        setDeepSearchDocs(data.documentIds);
        toast.success(
          `ค้นพบเอกสารที่มีเนื้อหาตรงกัน ${data.documentIds.length} รายการ`,
        );
      } else {
        setDeepSearchDocs([]);
        toast.error("ค้นหาไม่พบ");
      }
    } catch (e) {
      toast.error("เกิดข้อผิดพลาดในการค้นหาเนื้อหา");
    } finally {
      setIsDeepSearching(false);
    }
  };

  const handleToggleStar = async (
    docId: string,
    isCurrentlyFavorited: boolean,
  ) => {
    try {
      const res = await fetch("/api/documents/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docId }),
      });
      if (res.ok) {
        const { favorited } = await res.json();
        setDocuments(
          documents.map((d) => {
            if (d.id === docId) {
              const newFavs = favorited
                ? [...(d.favoritedBy || []), { userId: currentUserId }]
                : (d.favoritedBy || []).filter(
                    (f) => f.userId !== currentUserId,
                  );
              return { ...d, favoritedBy: newFavs };
            }
            return d;
          }),
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteClick = (docId: string, docTitle: string) => {
    setConfirmModal({ isOpen: true, docId, docTitle });
  };

  const handleConfirmDelete = async () => {
    const { docId } = confirmModal;
    setConfirmModal({ isOpen: false, docId: "", docTitle: "" });

    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");

      setDocuments(documents.filter((d) => d.id !== docId));
      toast.success("ลบเอกสารสำเร็จ");
    } catch (error) {
      toast.error("ไม่สามารถลบเอกสารได้ หรือคุณไม่มีสิทธิ์");
    }
  };

  const handleEditClick = (doc: Document) => {
    setEditModal({
      isOpen: true,
      docId: doc.id,
      title: doc.title,
      description: doc.description || "",
      tags: doc.tags || "",
      documentType: doc.documentType || "",
      documentCode: doc.documentCode || "",
      retentionPeriod: doc.retentionPeriod ? new Date(doc.retentionPeriod).toISOString().split('T')[0] : "",
      file: null,
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(true);

    try {
      const formData = new FormData();
      formData.append("title", editModal.title);
      formData.append("description", editModal.description);
      formData.append("tags", editModal.tags);
      formData.append("documentType", editModal.documentType);
      formData.append("documentCode", editModal.documentCode);
      formData.append("retentionPeriod", editModal.retentionPeriod);
      if (editModal.file) {
        formData.append("file", editModal.file);
      }

      const res = await fetch(`/api/documents/${editModal.docId}`, {
        method: "PUT",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Update failed");
      }

      const { document: updatedDoc } = await res.json();

      setDocuments(
        documents.map((d) =>
          d.id === editModal.docId ? { ...d, ...updatedDoc } : d,
        ),
      );

      toast.success("อัปเดตข้อมูลเอกสารสำเร็จ");
      setEditModal({ ...editModal, isOpen: false });
    } catch (error) {
      toast.error("ไม่สามารถแก้ไขเอกสารได้");
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
      {/* 1. ส่วนหัวและสลับมุมมอง */}
      <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-600 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-1 flex-wrap">
            {viewMode === "folder" ? (
              <>
                <span 
                  className={currentPath.length === 0 ? "" : "text-slate-500 cursor-pointer hover:text-blue-500"} 
                  onClick={() => setCurrentPath([])}
                >
                  หน้าหลัก
                </span>
                {currentPath.map((path, index) => (
                  <React.Fragment key={`bc-${path.id}`}>
                    <ChevronRight size={18} className="text-slate-400 mt-0.5" />
                    <span 
                      className={index === currentPath.length - 1 ? "" : "text-slate-500 cursor-pointer hover:text-blue-500"}
                      onClick={() => setCurrentPath(currentPath.slice(0, index + 1))}
                    >
                      {path.type === 'department' ? `แผนก ${path.name}` : path.name}
                    </span>
                  </React.Fragment>
                ))}
              </>
            ) : (
              "รายการเอกสารทั้งหมด"
            )}
          </h2>
          <p className="text-sm text-slate-500 dark:text-white mt-1">
            {viewMode === "folder"
              ? currentPath.length === 0 ? `พบ ${departments?.length || 0} แผนกหมวดหมู่` : ''
              : `พบเอกสารทั้งหมด ${filteredDocs.length} รายการ`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(currentUserRole === "SUPER_ADMIN" || (currentUserRole === "DEPT_HEAD" && currentPath.length > 0)) && (
            <button
              onClick={() => setShowCreateFolderModal(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border
                bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 
                dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30 dark:hover:bg-blue-500/30
              `}
            >
              {currentPath.length === 0 ? <Building2 size={16} /> : <Folder size={16} />} {currentPath.length === 0 ? "เพิ่มแผนกใหม่" : "สร้างแฟ้มย่อย"}
            </button>
          )}
        </div>
      </div>

      {/* 2. เนื้อหา (Document List & Folders) */}
      <>
        {/* Filters Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 transition-colors flex flex-col md:flex-row gap-4 items-center">

            {/* Search */}
            <div className="relative flex-1 w-full flex items-center gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400 dark:text-white" />
                </div>
                <input
                  type="text"
                  placeholder={currentPath.length === 0 ? "ค้นหาแผนก..." : "ค้นหาชื่อเอกสาร แฟ้มย่อย หรือ Tags..."}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (deepSearchDocs !== null) setDeepSearchDocs(null); // Reset deep search on change
                  }}
                  onKeyDown={(e) => {
                    if (currentPath.length > 0 && e.key === "Enter") handleDeepSearch();
                  }}
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:bg-white dark:bg-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm"
                />
              </div>
              {currentPath.length > 0 && (
                <button
                  onClick={handleDeepSearch}
                  disabled={isDeepSearching || !searchTerm.trim()}
                  className="px-4 py-2.5 bg-slate-800 dark:bg-slate-800 text-white font-medium rounded-xl hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed whitespace-nowrap shadow-sm flex items-center gap-2"
                  title="ค้นหาลึกลงไปถึงเนื้อหาด้านในเอกสาร (OCR/PDF)"
                >
                  {isDeepSearching ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <Search size={16} />
                  )}
                  <span className="hidden sm:inline">ค้นหาเนื้อหา</span>
                </button>
              )}
            </div>

            {/* Document Type Filter */}
            {currentPath.length > 0 && (
              <div className="md:w-48 relative">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:bg-white dark:bg-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm appearance-none"
                >
                  <option value="ALL">ทุกประเภท</option>
                  {documentTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FileText className="h-4 w-4 text-slate-400 dark:text-white" />
                </div>
              </div>
            )}

            {/* Date Filter */}
            {currentPath.length > 0 && (
              <div className="md:w-48 relative group">
                <input
                  type="text"
                  readOnly
                  value={filterDate ? format(new Date(filterDate), "dd/MM/yyyy") : ""}
                  placeholder="วว/ดด/ปปปป"
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:bg-white dark:bg-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm cursor-pointer"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-slate-400 dark:text-white" />
                </div>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
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
            )}


          </div>

          {/* 2. ตารางแสดงเอกสาร */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              {currentPath.length > 0 && (
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-white text-sm border-b border-slate-200 dark:border-slate-600">
                    <th className="font-semibold py-4 px-6">ชื่อเอกสาร</th>
                    {hasCustomSchema && selectedDocType ? (
                      selectedDocType.schema.map((field: any) => (
                        <th key={field.name} className="font-semibold py-4 px-6 whitespace-nowrap">{field.label}</th>
                      ))
                    ) : (
                      <>
                        <th className="font-semibold py-4 px-6">รหัสเอกสาร</th>
                        <th className="font-semibold py-4 px-6">Tags</th>
                        {currentUserRole === "SUPER_ADMIN" && (
                          <th className="font-semibold py-4 px-6">แผนก</th>
                        )}
                      </>
                    )}
                    <th className="font-semibold py-4 px-6">ผู้อัปโหลด</th>
                    <th className="font-semibold py-4 px-6">วันที่</th>
                    {!hasCustomSchema && (
                      <th className="font-semibold py-4 px-6">ขนาดไฟล์</th>
                    )}
                    <th className="font-semibold py-4 px-6 text-center">
                      จัดการ
                    </th>
                  </tr>
                </thead>
              )}
              <tbody className="divide-y divide-slate-100">
                {filteredDocs.length > 0 || (viewMode === "folder" && currentPath.length === 0) ? (
                  (() => {
                    const isFolderView = viewMode === "folder";
                    
                    let visibleDepartments: typeof departments = [];
                    let visibleFolders: typeof folders = [];
                    let visibleDocs: Document[] = [];

                    if (!isFolderView) {
                      visibleDocs = filteredDocs;
                    } else {
                      const currentLevel = currentPath.length === 0 ? null : currentPath[currentPath.length - 1];
                      const searchLower = searchTerm.toLowerCase();

                      if (!currentLevel) {
                        visibleDepartments = departments || [];
                        if (searchTerm) {
                          visibleDepartments = visibleDepartments.filter(d => 
                            d.name.toLowerCase().includes(searchLower)
                          );
                        }
                      } else if (currentLevel.type === "department") {
                        visibleFolders = folders.filter(f => f.departmentId === currentLevel.id && !f.parentId);
                        if (searchTerm) {
                          visibleFolders = visibleFolders.filter(f => 
                            f.name.toLowerCase().includes(searchLower)
                          );
                        }
                        visibleDocs = filteredDocs.filter(d => d.departmentId === currentLevel.id && !d.folder);
                      } else if (currentLevel.type === "folder") {
                        visibleFolders = folders.filter(f => f.parentId === currentLevel.id);
                        if (searchTerm) {
                          visibleFolders = visibleFolders.filter(f => 
                            f.name.toLowerCase().includes(searchLower)
                          );
                        }
                        visibleDocs = filteredDocs.filter(d => d.folder?.id === currentLevel.id);
                      }
                    }

                    return (
                      <>
                        {isFolderView && currentPath.length > 0 && (
                          <tr
                            className="bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                            onClick={() => {
                              setCurrentPath(prev => prev.slice(0, -1));
                            }}
                          >
                            <td
                              colSpan={hasCustomSchema ? 4 + (selectedDocType?.schema?.length || 0) : (currentUserRole === "SUPER_ADMIN" ? 8 : 7)}
                              className="py-3 px-6 text-sm font-medium text-slate-600 dark:text-slate-300 border-y border-slate-200 dark:border-slate-700"
                            >
                              <div className="flex items-center gap-2">
                                <ArrowLeft size={16} /> กลับไประดับก่อนหน้า
                              </div>
                            </td>
                          </tr>
                        )}

                        {visibleDepartments?.map((dept) => {
                          const subFoldersCount = folders.filter(f => f.departmentId === dept.id && !f.parentId).length;
                          const docsCount = documents.filter(d => d.departmentId === dept.id && !d.folder).length;
                          return (
                          <tr
                            key={`dept-${dept.id}`}
                            className="bg-slate-100 dark:bg-slate-800/70 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            onClick={() => setCurrentPath([{ id: dept.id, name: dept.name, type: "department" }])}
                          >
                            <td
                              colSpan={hasCustomSchema ? 4 + (selectedDocType?.schema?.length || 0) : (currentUserRole === "SUPER_ADMIN" ? 8 : 7)}
                              className="py-4 px-6 font-bold text-slate-700 dark:text-white text-sm border-y border-slate-200 dark:border-slate-600"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Building2 size={20} className="text-slate-600 dark:text-slate-300" />
                                  {dept.name}
                                </div>
                                <div className="flex items-center gap-4 text-xs font-normal text-slate-500 dark:text-slate-400">
                                  {subFoldersCount > 0 && <span>{subFoldersCount} แฟ้มย่อย</span>}
                                  {docsCount > 0 && <span>{docsCount} เอกสาร</span>}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )})}

                        {visibleFolders.map((folder) => {
                          const subFoldersCount = folders.filter(f => f.parentId === folder.id).length;
                          const docsCount = documents.filter(d => d.folder?.id === folder.id).length;
                          return (
                          <tr
                            key={`folder-${folder.id}`}
                            className="bg-slate-100 dark:bg-slate-800/70 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            onClick={() => setCurrentPath(prev => [...prev, { id: folder.id, name: folder.name, type: "folder" }])}
                          >
                            <td
                              colSpan={hasCustomSchema ? 4 + (selectedDocType?.schema?.length || 0) : (currentUserRole === "SUPER_ADMIN" ? 8 : 7)}
                              className="py-4 px-6 font-bold text-slate-700 dark:text-white text-sm border-y border-slate-200 dark:border-slate-600"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Folder
                                    size={20}
                                    className="text-blue-600 dark:text-blue-300"
                                  />
                                  {folder.name}
                                  {folder.description && (
                                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-2">
                                      - {folder.description}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-3 text-xs font-normal text-slate-500 dark:text-slate-400">
                                    {subFoldersCount > 0 && <span>{subFoldersCount} แฟ้มย่อย</span>}
                                    {docsCount > 0 && <span>{docsCount} เอกสาร</span>}
                                  </div>
                                  {currentUserRole === "SUPER_ADMIN" && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setManageAccessModal({ isOpen: true, folderId: folder.id, folderName: folder.name });
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                                      title="จัดการสิทธิ์การเข้าถึง"
                                    >
                                      <Shield size={16} /> <span className="text-xs ml-1 hidden sm:inline">จัดการสิทธิ์</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )})}

                        {visibleDocs.map((doc) => {
                          const isFavorited =
                            doc.favoritedBy?.some(
                              (f) => f.userId === currentUserId,
                            ) || false;

                              return (
                                <tr
                                  key={doc.id}
                                  className="hover:bg-blue-50 dark:hover:bg-blue-500/20/50"
                                >
                                  <td className="py-4 px-6">
                                    <div className="flex items-start gap-3">
                                      <button
                                        onClick={() =>
                                          handleToggleStar(doc.id, isFavorited)
                                        }
                                        className={`mt-1 p-1 rounded-full ${isFavorited ? "text-yellow-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-500/20" : "text-slate-300 hover:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-500/20"}`}
                                      >
                                        <Star
                                          size={20}
                                          fill={
                                            isFavorited
                                              ? "currentColor"
                                              : "none"
                                          }
                                        />
                                      </button>
                                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                                        <FileText size={20} />
                                      </div>
                                      <div>
                                        <p className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                                          {doc.title}
                                          {doc.currentVersion &&
                                            doc.currentVersion > 1 && (
                                              <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-white px-1.5 py-0.5 rounded">
                                                V{doc.currentVersion}.0
                                              </span>
                                            )}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-white mt-0.5 line-clamp-1">
                                          {doc.description || "-"}
                                        </p>
                                        {doc.departmentId === currentUserDepartmentId ? (
                                          <div className="mt-1">
                                            <span className="text-[10px] bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-medium">
                                              Master Copy (ต้นฉบับ)
                                            </span>
                                          </div>
                                        ) : (
                                          <div className="mt-1">
                                            <span className="text-[10px] bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                                              Copy (สำเนา)
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  {hasCustomSchema && selectedDocType ? (
                                    selectedDocType.schema.map((field: any) => {
                                      let val = doc.customFields?.[field.name];
                                      if (val === undefined || val === null) val = "-";
                                      else if (field.type === "checkbox") val = val ? "ใช่" : "ไม่ใช่";
                                      return (
                                        <td key={field.name} className="py-4 px-6">
                                          <div className="text-sm font-medium text-slate-700 dark:text-white line-clamp-2">
                                            {String(val)}
                                          </div>
                                        </td>
                                      );
                                    })
                                  ) : (
                                    <>
                                      <td className="py-4 px-6">
                                        <div className="text-sm font-medium text-slate-700 dark:text-white">
                                          {doc.documentCode || "-"}
                                        </div>
                                      </td>
                                      <td className="py-4 px-6">
                                        <div className="flex flex-col gap-1.5">
                                          <div className="flex flex-wrap gap-1">
                                            {(doc.documentTypeRef?.name || doc.documentType) && (
                                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-white border border-slate-200 dark:border-slate-600">
                                                <Tag size={12} />
                                                {doc.documentTypeRef?.name || doc.documentType}
                                              </span>
                                            )}
                                            {doc.tags
                                              .split(",")
                                              .filter(
                                                (t) =>
                                                  t.trim() !== "" &&
                                                  t.trim() !== doc.documentType &&
                                                  t.trim() !== doc.documentTypeRef?.name,
                                              )
                                              .map((tag, idx) => (
                                                <span
                                                  key={idx}
                                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-white border border-slate-200 dark:border-slate-600"
                                                >
                                                  <Tag size={12} />
                                                  {tag.trim()}
                                                </span>
                                              ))}
                                            {!doc.tags && !doc.documentType && !doc.documentTypeRef && (
                                              <span className="text-sm text-slate-400 dark:text-white">
                                                -
                                              </span>
                                            )}
                                          </div>
                                          {doc.customFields && Object.keys(doc.customFields).length > 0 && (
                                            <div className="flex flex-col gap-0.5 mt-1 border-t border-slate-100 dark:border-slate-700/50 pt-1">
                                              {Object.entries(doc.customFields).map(([key, value]) => {
                                                const fieldSchema = doc.documentTypeRef?.schema?.find((s: any) => s.name === key);
                                                const label = fieldSchema?.label || key;
                                                return (
                                                  <div key={key} className="text-[11px] flex gap-1 items-start">
                                                    <span className="font-medium text-slate-500 dark:text-slate-400 min-w-max">{label}:</span>
                                                    <span className="text-slate-700 dark:text-slate-200 break-words">{String(value)}</span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                      {currentUserRole === "SUPER_ADMIN" && (
                                        <td className="py-4 px-6">
                                          <div className="text-sm font-medium text-slate-600 dark:text-white">
                                            {doc.department?.name || "-"}
                                          </div>
                                        </td>
                                      )}
                                    </>
                                  )}
                                  <td className="py-4 px-6">
                                    <div className="text-sm font-medium text-slate-700 dark:text-white">
                                      {doc.uploader.name}
                                    </div>
                                  </td>
                                  <td className="py-4 px-6">
                                    <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-white">
                                      <Calendar
                                        size={14}
                                        className="text-slate-400 dark:text-white"
                                      />
                                      {format(
                                        new Date(doc.createdAt),
                                        "dd/MM/yyyy HH:mm",
                                      )}
                                    </div>
                                  </td>
                                  {!hasCustomSchema && (
                                    <td className="py-4 px-6">
                                      <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                        {formatFileSize(doc.fileSize)}
                                      </div>
                                    </td>
                                  )}
                                  <td className="py-4 px-6 whitespace-nowrap">
                                    <div className="flex items-center justify-center gap-2">
                                      {doc.fileType === "application/pdf" ? (
                                        <button
                                          onClick={() =>
                                            setViewModal({
                                              isOpen: true,
                                              url: `/api/documents/${doc.id}/download?view=true`,
                                              title: doc.title,
                                            })
                                          }
                                          className="p-2 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:bg-blue-500/20 rounded-lg transition"
                                          title="ดูเอกสาร"
                                        >
                                          <Eye size={18} />
                                        </button>
                                      ) : (
                                        <a
                                          href={`/api/documents/${doc.id}/download?view=true`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-2 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:bg-blue-500/20 rounded-lg transition"
                                          title="ดูเอกสาร"
                                        >
                                          <Eye size={18} />
                                        </a>
                                      )}
                                      <a
                                        href={`/api/documents/${doc.id}/download`}
                                        download
                                        className="p-2 text-slate-500 dark:text-white hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                                        title="ดาวน์โหลด"
                                      >
                                        <Download size={18} />
                                      </a>

                                      {doc.versions &&
                                        doc.versions.length > 0 && (
                                          <button
                                            onClick={() =>
                                              setHistoryModal({
                                                isOpen: true,
                                                doc,
                                              })
                                            }
                                            className="p-2 text-slate-500 dark:text-white hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                            title="ประวัติเวอร์ชัน"
                                          >
                                            <Calendar size={18} />
                                          </button>
                                        )}

                                      {(doc.uploader.name === currentUserId ||
                                        currentUserRole === "SUPER_ADMIN" ||
                                        permissions?.doc_edit) && (
                                        <>
                                          <button
                                            onClick={() => setCommentModal({ isOpen: true, doc })}
                                            className="p-2 text-slate-500 dark:text-white hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                            title="ความคิดเห็นและข้อเสนอแนะ"
                                          >
                                            <MessageSquare size={18} />
                                          </button>
                                          <button
                                            onClick={() => setLinkModal({ isOpen: true, doc })}
                                            className="p-2 text-slate-500 dark:text-white hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                            title="เชื่อมโยงเอกสาร (Link)"
                                          >
                                            <Link size={18} />
                                          </button>
                                          <button
                                            onClick={() => handleEditClick(doc)}
                                            className="p-2 text-slate-500 dark:text-white hover:text-orange-600 hover:bg-orange-50 rounded-lg transition"
                                            title="แก้ไขข้อมูลเอกสาร"
                                          >
                                            <Edit size={18} />
                                          </button>
                                        </>
                                      )}
                                      
                                      {(doc.uploader.name === currentUserId ||
                                        currentUserRole === "SUPER_ADMIN" ||
                                        permissions?.doc_delete) && (
                                        <button
                                          onClick={() =>
                                            handleDeleteClick(
                                                doc.id,
                                                doc.title,
                                              )
                                            }
                                            className="p-2 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-lg transition"
                                            title="ลบเอกสาร"
                                          >
                                            <Trash2 size={18} />
                                          </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </>
                      );
                  })()
                ) : (
                  <tr>
                    <td
                      colSpan={hasCustomSchema ? 4 + (selectedDocType?.schema?.length || 0) : (currentUserRole === "SUPER_ADMIN" ? 8 : 7)}
                      className="py-12 text-center text-slate-500 dark:text-white"
                    >
                      <div className="inline-flex flex-col items-center justify-center text-slate-400 dark:text-white">
                        <Search size={48} className="mb-4 opacity-20" />
                        <p className="text-lg font-medium">ไม่พบเอกสาร</p>
                        <p className="text-sm mt-1">
                          ลองเปลี่ยนคำค้นหา หรืออัปโหลดเอกสารใหม่
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="ยืนยันการลบเอกสาร"
        message={`คุณแน่ใจหรือไม่ว่าต้องการลบเอกสาร "${confirmModal.docTitle}"? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        onConfirm={handleConfirmDelete}
        onCancel={() =>
          setConfirmModal({ isOpen: false, docId: "", docTitle: "" })
        }
      />

      {/* Edit Modal */}
      {editModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-600 flex items-center gap-2 bg-slate-50 dark:bg-slate-800">
              <Edit className="text-slate-400 dark:text-white" size={20} />
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                แก้ไขข้อมูลเอกสาร
              </h3>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1">
                  ชื่อเอกสาร
                </label>
                <input
                  type="text"
                  required
                  value={editModal.title}
                  onChange={(e) =>
                    setEditModal({ ...editModal, title: e.target.value })
                  }
                  className="w-full p-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1">
                  รหัสเอกสาร (ถ้าต้องการแก้ไข)
                </label>
                <input
                  type="text"
                  value={editModal.documentCode}
                  onChange={(e) =>
                    setEditModal({ ...editModal, documentCode: e.target.value })
                  }
                  className="w-full p-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="ปล่อยว่างเพื่อคงเดิม"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1">
                  คำอธิบาย
                </label>
                <textarea
                  rows={2}
                  value={editModal.description}
                  onChange={(e) =>
                    setEditModal({ ...editModal, description: e.target.value })
                  }
                  className="w-full p-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1">
                  ประเภทเอกสาร
                </label>
                <div className="flex gap-2">
                  <select
                    value={editModal.documentType}
                    onChange={(e) => setEditModal({ ...editModal, documentType: e.target.value })}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none"
                  >
                    <option value="">-- ไม่ระบุ --</option>
                    {documentTypes.map((type) => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1">
                  วันที่หมดอายุ / อายุการจัดเก็บ
                </label>
                <input
                  type="date"
                  value={editModal.retentionPeriod}
                  onChange={(e) =>
                    setEditModal({ ...editModal, retentionPeriod: e.target.value })
                  }
                  className="w-full p-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1">
                  Tags (คั่นด้วยลูกน้ำ)
                </label>
                <input
                  type="text"
                  value={editModal.tags}
                  onChange={(e) =>
                    setEditModal({ ...editModal, tags: e.target.value })
                  }
                  className="w-full p-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="เช่น ระเบียบการ, 2567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-white mb-2">
                  อัปโหลดไฟล์เวอร์ชันใหม่ (ถ้ามี)
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="w-full sm:w-auto px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white font-medium rounded-lg shadow-sm hover:bg-slate-50 transition-all duration-200"
                  >
                    ค้นหาไฟล์ในเครื่อง
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEditScannerModal(true);
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-medium rounded-lg shadow-sm hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all duration-200 border border-blue-200 dark:border-blue-800 flex items-center justify-center gap-2"
                  >
                    <Inbox size={16} />
                    ดึงจากเครื่องสแกน
                  </button>
                </div>
                {editModal.file && (
                  <div className="mt-3 text-sm text-blue-600 dark:text-blue-400 font-medium bg-blue-50/50 dark:bg-blue-900/20 p-2 rounded-lg border border-blue-100 dark:border-blue-800">
                    ✅ เลือกไฟล์แล้ว: {editModal.file.name}
                  </div>
                )}
                <input
                  type="file"
                  ref={editFileInputRef}
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) =>
                    setEditModal({ ...editModal, file: e.target.files?.[0] || null })
                  }
                  className="hidden"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditModal({ ...editModal, isOpen: false })}
                  className="flex-1 py-2.5 text-slate-600 dark:text-white bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors transition-all duration-200 font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="flex-1 py-2.5 text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition font-medium disabled:opacity-50"
                >
                  {isEditing ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View PDF Modal */}
      {viewModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900 flex flex-col z-[60]">
          <div className="w-full bg-white dark:bg-slate-900 transition-colors p-4 flex justify-between items-center shadow-sm">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <FileText className="text-blue-600 dark:text-blue-300" />
              {viewModal.title}
            </h3>
            <button
              onClick={() =>
                setViewModal({ isOpen: false, url: "", title: "" })
              }
              className="p-2 text-slate-400 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors dark:bg-slate-800 hover:text-red-500 rounded-lg"
            >
              <XCircle size={24} />
            </button>
          </div>
          <div className="w-full flex-1 bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <iframe
              src={viewModal.url}
              className="w-full h-full border-0"
              title="PDF Viewer"
            />
          </div>
        </div>
      )}

      {/* History (Version Control) Modal */}
      {historyModal.isOpen && historyModal.doc && (
        <div className="fixed inset-0 bg-slate-900/50 flex flex-col items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-600 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="text-indigo-500" size={24} />
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                  ประวัติเวอร์ชันของเอกสาร
                </h3>
              </div>
              <button
                onClick={() => setHistoryModal({ isOpen: false, doc: null })}
                className="p-2 text-slate-400 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors dark:bg-slate-700 transition-colors hover:text-red-500 rounded-lg transition"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <p className="text-slate-800 dark:text-white font-semibold mb-4 text-lg border-b pb-2">
                {historyModal.doc.title}
              </p>

              <div className="space-y-4">
                {/* Current Version */}
                <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-100 rounded-xl">
                  <div>
                    <span className="inline-block px-2.5 py-1 bg-emerald-200 text-emerald-800 rounded text-xs font-bold mb-1">
                      เวอร์ชันปัจจุบัน (V{historyModal.doc.currentVersion}.0)
                    </span>
                    <p className="text-sm text-slate-600 dark:text-white">
                      อัปโหลดล่าสุด:{" "}
                      {format(
                        new Date(
                          historyModal.doc.updatedAt ||
                            historyModal.doc.createdAt,
                        ),
                        "dd MMM yyyy HH:mm",
                      )}{" "}
                      โดย {historyModal.doc.uploader.name}
                    </p>
                    <div className="mt-2 text-xs text-slate-500 dark:text-white flex items-center gap-2">
                      <span className="font-semibold text-emerald-700">
                        ขนาดไฟล์:
                      </span>
                      {formatFileSize(historyModal.doc.fileSize)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {historyModal.doc.fileType === "application/pdf" && (
                      <button
                        onClick={() =>
                          setViewModal({
                            isOpen: true,
                            url: `/api/documents/${historyModal.doc?.id}/download?view=true`,
                            title: historyModal.doc?.title || "",
                          })
                        }
                        className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 transition-colors text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 dark:bg-emerald-500/20 transition-colors flex items-center gap-1"
                      >
                        <Eye size={14} /> ดู
                      </button>
                    )}
                    <a
                      href={`/api/documents/${historyModal.doc.id}/download`}
                      download
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition flex items-center gap-2"
                    >
                      <Download size={16} /> ดาวน์โหลด
                    </a>
                  </div>
                </div>

                {/* Old Versions */}
                {historyModal.doc.versions?.map((v) => (
                  <div
                    key={v.version}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl"
                  >
                    <div>
                      <span className="inline-block px-2.5 py-1 bg-slate-200 dark:bg-slate-700 transition-colors text-slate-700 dark:text-white rounded text-xs font-bold mb-1">
                        เวอร์ชัน {v.version}.0
                      </span>
                      <p className="text-sm text-slate-600 dark:text-white">
                        อัปโหลดเมื่อ:{" "}
                        {format(new Date(v.createdAt), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {v.fileType === "application/pdf" && (
                        <button
                          onClick={() =>
                            setViewModal({
                              isOpen: true,
                              url: `/api/documents/${historyModal.doc?.id}/download?view=true&versionId=${v.id}`,
                              title: `${historyModal.doc?.title} (เวอร์ชัน ${v.version}.0)` || "",
                            })
                          }
                          className="px-4 py-2 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-white text-sm font-medium rounded-lg transition flex items-center gap-2"
                        >
                          <Eye size={16} /> ดู
                        </button>
                      )}
                      <a
                        href={`/api/documents/${historyModal.doc?.id}/download?versionId=${v.id}`}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 transition-colors border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-lg transition flex items-center gap-2"
                      >
                        <Download size={16} /> โหลดไฟล์เก่า
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                {currentPath.length === 0 ? "สร้างหมวดหมู่เอกสารใหม่" : "สร้างแฟ้มย่อยใหม่"}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {currentPath.length === 0 ? "กำหนดชื่อแผนกหรือหมวดหมู่เอกสาร" : "กำหนดชื่อแฟ้มย่อย"}
              </p>
            </div>
            <form onSubmit={handleCreateFolder} className="p-6 space-y-4 bg-slate-50 dark:bg-slate-800">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {currentPath.length === 0 ? "ชื่อหมวดหมู่" : "ชื่อแฟ้มย่อย"}
                </label>
                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
                  placeholder="เช่น แผนกบัญชี, จัดซื้อ..."
                />
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowCreateFolderModal(false)}
                  className="px-4 py-2.5 rounded-xl font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isCreatingFolder || !newFolderName.trim()}
                  className="px-4 py-2.5 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreatingFolder ? "กำลังสร้าง..." : "บันทึก"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <FolderAccessModal
        isOpen={manageAccessModal.isOpen}
        onClose={() => setManageAccessModal({ ...manageAccessModal, isOpen: false })}
        folderId={manageAccessModal.folderId}
        folderName={manageAccessModal.folderName}
      />

      {linkModal.isOpen && linkModal.doc && (
        <DocumentLinkModal 
           isOpen={linkModal.isOpen}
           docId={linkModal.doc.id}
           docTitle={linkModal.doc.title}
           onClose={() => setLinkModal({ isOpen: false, doc: null })}
        />
      )}

      {commentModal.isOpen && commentModal.doc && (
        <DocumentCommentModal 
           isOpen={commentModal.isOpen}
           docId={commentModal.doc.id}
           docTitle={commentModal.doc.title}
           currentUserId={currentUserId}
           currentUserRole={currentUserRole}
           onClose={() => setCommentModal({ isOpen: false, doc: null })}
        />
      )}

      <ScannerSelectionModal
        isOpen={showEditScannerModal}
        onClose={() => setShowEditScannerModal(false)}
        onFileSelect={handleEditScannerFileSelect}
      />
    </div>
  );
}

"use client";

import React, { useState, useMemo, useEffect } from "react";
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
} from "lucide-react";
import { format, isToday, isThisWeek, isThisMonth } from "date-fns";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import ConfirmModal from "./ConfirmModal";
import { usePermissions } from "@/hooks/usePermissions";

type Document = {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileType: string;
  tags: string;
  visibility: string;
  currentVersion?: number;
  documentType?: string | null;
  favoritedBy?: { userId: string }[];
  versions?: {
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
  department?: {
    name: string;
  };
};

export default function DocumentList({
  initialDocuments,
  currentUserId,
  currentUserRole,
  departments = [],
}: {
  initialDocuments: Document[];
  currentUserId: string;
  currentUserRole: string;
  departments?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { permissions } = usePermissions(currentUserRole);
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");

  const [deepSearchDocs, setDeepSearchDocs] = useState<string[] | null>(null);
  const [isDeepSearching, setIsDeepSearching] = useState(false);

  const [viewMode, setViewMode] = useState<"folder" | "list">("folder");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

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
    visibility: string;
    file: File | null;
  }>({
    isOpen: false,
    docId: "",
    title: "",
    description: "",
    tags: "",
    documentType: "",
    visibility: "DEPARTMENT",
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

  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const [savedDocTypes, setSavedDocTypes] = useState<string[]>([
    "แบบฟอร์ม",
    "ประกาศ",
    "แนวทางปฏิบัติ",
    "ระเบียบการ",
    "อื่นๆ",
  ]);

  useEffect(() => {
    const loadedDocTypes = localStorage.getItem("dms_saved_doctypes");
    if (loadedDocTypes) {
      setSavedDocTypes(JSON.parse(loadedDocTypes));
    }
  }, []);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setIsCreatingFolder(true);
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create folder");
      }

      toast.success("สร้างหมวดหมู่สำเร็จ");
      setShowCreateFolderModal(false);
      setNewFolderName("");
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "เกิดข้อผิดพลาดในการสร้างหมวดหมู่");
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleSaveEditDocType = () => {
    if (!editModal.documentType.trim()) return;
    const newType = editModal.documentType.trim();
    if (!savedDocTypes.includes(newType)) {
      const updatedTypes = [...savedDocTypes, newType];
      setSavedDocTypes(updatedTypes);
      localStorage.setItem("dms_saved_doctypes", JSON.stringify(updatedTypes));
      toast.success("บันทึกประเภทเอกสารใหม่เรียบร้อยแล้ว");
    } else {
      toast.success("มีประเภทเอกสารนี้อยู่แล้ว");
    }
  };

  const folders = useMemo(() => {
    const deptMap = new Map<string, number>();

    // Initialize all departments with 0 count
    if (departments && departments.length > 0) {
      departments.forEach((dept) => {
        deptMap.set(dept.name, 0);
      });
    }

    documents.forEach((doc) => {
      const deptName = doc.department?.name || "ทั่วไป / ไม่ระบุแผนก";
      if (deptMap.has(deptName)) {
        deptMap.set(deptName, deptMap.get(deptName)! + 1);
      } else {
        deptMap.set(deptName, 1);
      }
    });
    return Array.from(deptMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => {
        if (a.name === "ทั่วไป / ไม่ระบุแผนก") return 1;
        if (b.name === "ทั่วไป / ไม่ระบุแผนก") return -1;
        return a.name.localeCompare(b.name, "th");
      });
  }, [documents, departments]);

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

      // 3. Department Filter
      let matchesDept = true;
      if (filterDepartment !== "ALL") {
        matchesDept = doc.department?.name === filterDepartment;
      }

      // 4. Type Filter
      let matchesType = true;
      if (filterType !== "ALL") {
        matchesType = doc.documentType === filterType;
      }

      // 5. Folder Filter (List View Mode inside a Folder)
      let matchesFolder = true;
      if (selectedFolder) {
        matchesFolder =
          (doc.department?.name || "ทั่วไป / ไม่ระบุแผนก") === selectedFolder;
      }

      return (
        matchesSearch &&
        matchesDate &&
        matchesDept &&
        matchesType &&
        matchesFolder
      );
    });
  }, [
    documents,
    searchTerm,
    filterDate,
    filterDepartment,
    filterType,
    selectedFolder,
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
      visibility: doc.visibility || "DEPARTMENT",
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
      formData.append("visibility", editModal.visibility);
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
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            {viewMode === "folder" && !selectedFolder
              ? "หมวดหมู่เอกสาร"
              : "รายการเอกสาร"}
          </h2>
          <p className="text-sm text-slate-500 dark:text-white mt-1">
            {viewMode === "folder" && !selectedFolder
              ? `พบ ${folders.length} แผนกหมวดหมู่`
              : `พบเอกสารทั้งหมด ${filteredDocs.length} รายการ`}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-200 dark:bg-slate-700 transition-colors p-1 rounded-xl">
          <button
            onClick={() => {
              setViewMode("folder");
              setSelectedFolder(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === "folder"
                ? "bg-white dark:bg-slate-900 transition-colors text-blue-600 dark:text-blue-300 shadow-sm"
                : "text-slate-600 dark:text-white hover:bg-slate-300/50"
            }`}
          >
            <LayoutGrid size={16} /> โฟลเดอร์
          </button>
          <button
            onClick={() => {
              setViewMode("list");
              setSelectedFolder(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === "list"
                ? "bg-white dark:bg-slate-900 transition-colors text-blue-600 dark:text-blue-300 shadow-sm"
                : "text-slate-600 dark:text-white hover:bg-slate-300/50"
            }`}
          >
            <List size={16} /> รายการทั้งหมด
          </button>
          
          {currentUserRole === "SUPER_ADMIN" && (
            <button
              onClick={() => setShowCreateFolderModal(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border
                bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 
                dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30 dark:hover:bg-blue-500/30
              `}
            >
              <Folder size={16} /> สร้างหมวดหมู่
            </button>
          )}
        </div>
      </div>

      {/* 2. เนื้อหา (Folder Grid OR Document List) */}

      {viewMode === "folder" && !selectedFolder ? (
        // ================= FOLDER GRID VIEW =================
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {folders.map((folder) => (
              <button
                key={folder.name}
                onClick={() => setSelectedFolder(folder.name)}
                className="flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 transition-colors border border-slate-200 dark:border-slate-600 rounded-2xl hover:border-blue-300 hover:shadow-md hover:bg-blue-50 dark:hover:bg-blue-500/20/30 transition-all group"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-500/20 text-blue-500 dark:text-blue-300 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Folder
                    size={32}
                    fill="currentColor"
                    className="opacity-20 absolute"
                  />
                  <Folder size={32} className="relative z-10" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white text-center line-clamp-1">
                  {folder.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-white mt-1">
                  {folder.count} เอกสาร
                </p>
              </button>
            ))}
          </div>
          {folders.length === 0 && (
            <div className="py-16 text-center text-slate-400 dark:text-white">
              <Folder size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">ไม่มีหมวดหมู่เอกสาร</p>
            </div>
          )}
        </div>
      ) : (
        // ================= DOCUMENT LIST VIEW =================
        <>
          {/* Filters Toolbar */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 transition-colors flex flex-col md:flex-row gap-4 items-center">
            {selectedFolder && (
              <button
                onClick={() => setSelectedFolder(null)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors dark:bg-slate-700 transition-colors text-slate-700 dark:text-white font-medium rounded-xl transition whitespace-nowrap"
              >
                <ArrowLeft size={18} />
                กลับไปโฟลเดอร์
              </button>
            )}

            {/* Search */}
            <div className="relative flex-1 w-full flex items-center gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400 dark:text-white" />
                </div>
                <input
                  type="text"
                  placeholder="ค้นหาชื่อเอกสาร หรือ Tags..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (deepSearchDocs !== null) setDeepSearchDocs(null); // Reset deep search on change
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleDeepSearch();
                  }}
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:bg-white dark:bg-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm"
                />
              </div>
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
            </div>

            {/* Document Type Filter */}
            <div className="md:w-48 relative">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:bg-white dark:bg-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm appearance-none"
              >
                <option value="ALL">ทุกประเภท</option>
                {savedDocTypes.map((type, idx) => (
                  <option key={idx} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FileText className="h-4 w-4 text-slate-400 dark:text-white" />
              </div>
            </div>

            {/* Date Filter */}
            <div className="md:w-48 relative">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:bg-white dark:bg-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-slate-400 dark:text-white" />
              </div>
            </div>

            {/* Department Filter (Only for SUPER_ADMIN) */}
            {currentUserRole === "SUPER_ADMIN" && departments.length > 0 && (
              <div className="md:w-48 relative">
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:bg-white dark:bg-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm appearance-none"
                >
                  <option value="ALL">แผนกทั้งหมด</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-4 w-4 text-slate-400 dark:text-white" />
                </div>
              </div>
            )}
          </div>

          {/* 2. ตารางแสดงเอกสาร */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-white text-sm border-b border-slate-200 dark:border-slate-600">
                  <th className="font-semibold py-4 px-6">ชื่อเอกสาร</th>
                  <th className="font-semibold py-4 px-6">Tags</th>
                  {currentUserRole === "SUPER_ADMIN" && (
                    <th className="font-semibold py-4 px-6">แผนก</th>
                  )}
                  <th className="font-semibold py-4 px-6">ผู้อัปโหลด</th>
                  <th className="font-semibold py-4 px-6">วันที่</th>
                  <th className="font-semibold py-4 px-6 text-center">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocs.length > 0 ? (
                  (() => {
                    const groups = new Map<string, typeof documents>();
                    filteredDocs.forEach((doc) => {
                      const deptName =
                        doc.department?.name || "ทั่วไป / ไม่ระบุแผนก";
                      if (!groups.has(deptName)) groups.set(deptName, []);
                      groups.get(deptName)!.push(doc);
                    });

                    const sortedGroups = Array.from(groups.entries()).sort(
                      (a, b) => {
                        if (a[0] === "ทั่วไป / ไม่ระบุแผนก") return 1;
                        if (b[0] === "ทั่วไป / ไม่ระบุแผนก") return -1;
                        return a[0].localeCompare(b[0]);
                      },
                    );

                    return sortedGroups.map(([deptName, groupDocs]) => {
                      const isSearching = searchTerm.trim().length > 0;

                      return (
                        <React.Fragment key={deptName}>
                          {!selectedFolder && (
                            <tr
                              className="bg-slate-100 dark:bg-slate-800/70 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors dark:bg-slate-700 transition-colors/70 cursor-pointer"
                              onClick={() => setSelectedFolder(deptName)}
                            >
                              <td
                                colSpan={
                                  currentUserRole === "SUPER_ADMIN" ? 6 : 5
                                }
                                className="py-4 px-6 font-bold text-slate-700 dark:text-white text-sm border-y border-slate-200 dark:border-slate-600"
                              >
                                <div className="flex items-center gap-3">
                                  <Folder
                                    size={20}
                                    className="text-blue-600 dark:text-blue-300"
                                  />
                                  {deptName}
                                  <span className="text-xs font-normal text-slate-500 dark:text-white bg-white dark:bg-slate-900 transition-colors px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-600 shadow-sm">
                                    {groupDocs.length} รายการ
                                  </span>
                                </div>
                              </td>
                            </tr>
                          )}
                          {(selectedFolder ||
                            (isSearching && !selectedFolder)) &&
                            groupDocs.map((doc) => {
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
                                        {doc.visibility === "PRIVATE" && (
                                          <div className="mt-1">
                                            <span className="text-[10px] bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-medium">
                                              ส่วนตัว
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-4 px-6">
                                    <div className="flex flex-col gap-1.5">
                                      <div className="flex flex-wrap gap-1">
                                        {doc.documentType && (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-white border border-slate-200 dark:border-slate-600">
                                            <Tag size={12} />
                                            {doc.documentType}
                                          </span>
                                        )}
                                        {doc.tags
                                          .split(",")
                                          .filter(
                                            (t) =>
                                              t.trim() !== "" &&
                                              t.trim() !== doc.documentType,
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
                                        {!doc.tags && !doc.documentType && (
                                          <span className="text-sm text-slate-400 dark:text-white">
                                            -
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  {currentUserRole === "SUPER_ADMIN" && (
                                    <td className="py-4 px-6">
                                      <div className="text-sm font-medium text-slate-600 dark:text-white">
                                        {doc.department?.name || "-"}
                                      </div>
                                    </td>
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
                                        <button
                                          onClick={() => handleEditClick(doc)}
                                          className="p-2 text-slate-500 dark:text-white hover:text-orange-600 hover:bg-orange-50 rounded-lg transition"
                                          title="แก้ไขข้อมูลเอกสาร"
                                        >
                                          <Edit size={18} />
                                        </button>
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
                        </React.Fragment>
                      );
                    });
                  })()
                ) : (
                  <tr>
                    <td
                      colSpan={currentUserRole === "SUPER_ADMIN" ? 6 : 5}
                      className="py-16 text-center"
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
      )}

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
                  <input
                    list="editDocTypesList"
                    value={editModal.documentType}
                    onChange={(e) =>
                      setEditModal({
                        ...editModal,
                        documentType: e.target.value,
                      })
                    }
                    className="w-full p-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="เลือกหรือพิมพ์ประเภทเอกสารใหม่..."
                  />
                  <datalist id="editDocTypesList">
                    {savedDocTypes.map((type, idx) => (
                      <option key={idx} value={type} />
                    ))}
                  </datalist>
                  <button
                    type="button"
                    onClick={handleSaveEditDocType}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors dark:bg-slate-700 transition-colors text-slate-700 dark:text-white text-sm font-medium rounded-xl transition whitespace-nowrap shrink-0"
                  >
                    บันทึก
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1">
                  สิทธิ์การเข้าถึง (Visibility)
                </label>
                <select
                  value={editModal.visibility}
                  onChange={(e) =>
                    setEditModal({ ...editModal, visibility: e.target.value })
                  }
                  className="w-full p-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="DEPARTMENT">
                    เห็นเฉพาะคนในแผนก (DEPARTMENT)
                  </option>
                  <option value="PUBLIC">เห็นได้ทุกแผนก (PUBLIC)</option>
                  <option value="PRIVATE">ส่วนตัว (PRIVATE)</option>
                </select>
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
                <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1">
                  อัปโหลดไฟล์เวอร์ชันใหม่ (ถ้ามี)
                </label>
                <input
                  type="file"
                  onChange={(e) =>
                    setEditModal({
                      ...editModal,
                      file: e.target.files?.[0] || null,
                    })
                  }
                  className="w-full text-sm text-slate-500 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:bg-blue-500/20 file:text-blue-700 dark:text-blue-300 hover:file:bg-blue-100 dark:bg-blue-500/20 transition"
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
        <div className="fixed inset-0 bg-slate-900/80 flex flex-col items-center justify-center z-[60] p-4">
          <div className="w-full max-w-5xl bg-white dark:bg-slate-900 transition-colors rounded-t-xl p-4 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <FileText className="text-blue-600 dark:text-blue-300" />
              {viewModal.title}
            </h3>
            <button
              onClick={() =>
                setViewModal({ isOpen: false, url: "", title: "" })
              }
              className="p-2 text-slate-400 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors dark:bg-slate-800 hover:text-red-500 rounded-lg transition"
            >
              <XCircle size={24} />
            </button>
          </div>
          <div className="w-full max-w-5xl h-[80vh] bg-slate-100 dark:bg-slate-800 rounded-b-xl overflow-hidden">
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
                        "dd/MM/yyyy HH:mm",
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
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
                      <a
                        href={v.fileUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors dark:bg-slate-800 text-slate-700 dark:text-white text-sm font-medium rounded-lg transition flex items-center gap-2"
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
                สร้างหมวดหมู่เอกสารใหม่
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                กำหนดชื่อแผนกหรือหมวดหมู่เอกสาร
              </p>
            </div>
            <form onSubmit={handleCreateFolder} className="p-6 space-y-4 bg-slate-50 dark:bg-slate-800">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อหมวดหมู่
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
    </div>
  );
}

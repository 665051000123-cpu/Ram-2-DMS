"use client";

import { useState, useMemo } from "react";
import { Folder as FolderIcon, Plus, Trash2, FileText, Search, Edit2, X, Check, Shield } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import ConfirmModal from "./ConfirmModal";
import FolderAccessModal from "./FolderAccessModal";

type Folder = {
  id: string;
  name: string;
  description: string | null;
  departmentId: string | null;
  department: { id: string, name: string } | null;
  parentId: string | null;
  parent: { id: string, name: string } | null;
  createdAt: Date;
  _count: {
    documents: number;
  };
};

export default function FolderSettings({
  initialFolders,
  departments,
}: {
  initialFolders: Folder[];
  departments: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>(initialFolders);
  const [isAdding, setIsAdding] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");
  const [newFolderDept, setNewFolderDept] = useState("");
  const [newFolderParent, setNewFolderParent] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [editFolderDesc, setEditFolderDesc] = useState("");
  const [editFolderDept, setEditFolderDept] = useState("");
  const [editFolderParent, setEditFolderParent] = useState("");

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    folderId: string;
    folderName: string;
  }>({
    isOpen: false,
    folderId: "",
    folderName: "",
  });

  const [manageAccessModal, setManageAccessModal] = useState<{
    isOpen: boolean;
    folderId: string;
    folderName: string;
  }>({
    isOpen: false,
    folderId: "",
    folderName: "",
  });



  const filteredFolders = useMemo(() => {
    return folders.filter((f) =>
      f.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [folders, searchTerm]);

  const handleAddFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setLoading(true);

    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newFolderName.trim(),
          description: newFolderDesc.trim(),
          departmentId: newFolderDept || null,
          parentId: newFolderParent || null
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create folder");
      }

      const { folder } = await res.json();

      const newFolder: Folder = {
        ...folder,
        department: departments.find(d => d.id === folder.departmentId) || null,
        parent: folders.find(f => f.id === folder.parentId) || null,
        _count: { documents: 0 },
      };

      setFolders([newFolder, ...folders]);
      setNewFolderName("");
      setNewFolderDesc("");
      setNewFolderDept("");
      setNewFolderParent("");
      setIsAdding(false);
      toast.success("เพิ่มแฟ้มสำเร็จ");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (folderId: string, folderName: string) => {
    setConfirmModal({ isOpen: true, folderId, folderName });
  };

  const handleConfirmDelete = async () => {
    const { folderId } = confirmModal;
    setConfirmModal({ isOpen: false, folderId: "", folderName: "" });

    try {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete folder");
      }

      setFolders(folders.filter((f) => f.id !== folderId));
      toast.success("ลบแฟ้มสำเร็จ");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleEditSubmit = async (folderId: string) => {
    if (!editFolderName.trim()) {
      setEditingFolderId(null);
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: editFolderName.trim(),
          description: editFolderDesc.trim(),
          departmentId: editFolderDept || null,
          parentId: editFolderParent || null
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update folder");
      }

      const { folder: updatedFolderData } = await res.json();

      setFolders(folders.map(f => 
        f.id === folderId ? { 
          ...f, 
          name: updatedFolderData.name,
          description: updatedFolderData.description,
          departmentId: updatedFolderData.departmentId,
          department: departments.find(d => d.id === updatedFolderData.departmentId) || null,
          parentId: updatedFolderData.parentId,
          parent: folders.find(parent => parent.id === updatedFolderData.parentId) || null
        } : f
      ));
      toast.success("แก้ไขแฟ้มสำเร็จ");
      setEditingFolderId(null);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-600 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
        <div className="flex items-center gap-2">
          <FolderIcon className="text-slate-400 dark:text-white" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            จัดการแฟ้มเอกสาร (Folders)
          </h2>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400 dark:text-white" />
            </div>
            <input
              type="text"
              placeholder="ค้นหาแฟ้ม..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full md:w-64 pl-9 pr-4 py-2 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm"
            />
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-sm font-medium shrink-0"
          >
            <Plus size={18} />
            สร้างแฟ้ม
          </button>
        </div>
      </div>

      {/* Add Form */}
      {isAdding && (
        <div className="p-6 border-b border-slate-200 dark:border-slate-600 bg-blue-50 dark:bg-blue-500/20">
          <form onSubmit={handleAddFolder} className="flex flex-col gap-4 max-w-2xl">
            <div className="flex gap-4">
              <input
                type="text"
                required
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="ชื่อแฟ้ม เช่น ระเบียบการบริษัท"
                className="flex-1 p-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <select
                value={newFolderDept}
                onChange={(e) => setNewFolderDept(e.target.value)}
                className="w-1/3 p-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">-- ไม่สังกัดแผนก (ส่วนกลาง) --</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-4">
              <input
                type="text"
                value={newFolderDesc}
                onChange={(e) => setNewFolderDesc(e.target.value)}
                placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
                className="flex-1 p-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <select
                value={newFolderParent}
                onChange={(e) => setNewFolderParent(e.target.value)}
                className="w-1/3 p-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">-- แฟ้มหลัก --</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium disabled:opacity-50"
              >
                {loading ? "กำลังสร้าง..." : "บันทึก"}
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2.5 text-slate-500 dark:text-white hover:text-slate-700 dark:text-white font-medium"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white dark:bg-slate-900 transition-colors text-slate-500 dark:text-white text-sm border-b border-slate-200 dark:border-slate-600">
              <th className="font-semibold py-4 px-6">ชื่อแฟ้ม</th>
              <th className="font-semibold py-4 px-6">สังกัดแผนก</th>
              <th className="font-semibold py-4 px-6 text-center">เอกสาร</th>
              <th className="font-semibold py-4 px-6">วันที่สร้าง</th>
              <th className="font-semibold py-4 px-6 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredFolders.length > 0 ? (
              filteredFolders.map((folder) => (
                <tr
                  key={folder.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <td className="py-4 px-6 font-medium text-slate-800 dark:text-white">
                    {editingFolderId === folder.id ? (
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          value={editFolderName}
                          onChange={(e) => setEditFolderName(e.target.value)}
                          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditSubmit(folder.id);
                            if (e.key === 'Escape') setEditingFolderId(null);
                          }}
                        />
                        <input
                          type="text"
                          value={editFolderDesc}
                          onChange={(e) => setEditFolderDesc(e.target.value)}
                          placeholder="รายละเอียด"
                          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                        />
                        <select
                          value={editFolderParent}
                          onChange={(e) => setEditFolderParent(e.target.value)}
                          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                        >
                          <option value="">-- แฟ้มหลัก --</option>
                          {folders.filter(f => f.id !== folder.id).map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <span>{folder.name}</span>
                        {folder.parent && (
                          <span className="text-xs text-slate-400">อยู่ภายใต้: {folder.parent.name}</span>
                        )}
                        {folder.description && (
                          <span className="text-xs text-slate-500">{folder.description}</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6 text-slate-500 dark:text-white">
                    {editingFolderId === folder.id ? (
                      <select
                        value={editFolderDept}
                        onChange={(e) => setEditFolderDept(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                      >
                        <option value="">-- ส่วนกลาง --</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    ) : (
                      folder.department?.name || "- ส่วนกลาง -"
                    )}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 rounded-full text-sm font-medium">
                      <FileText size={14} />
                      {folder._count.documents}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-slate-500 dark:text-white text-sm">
                    {format(new Date(folder.createdAt), "dd MMM yyyy")}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center gap-2">
                      {editingFolderId === folder.id ? (
                        <>
                          <button
                            onClick={() => handleEditSubmit(folder.id)}
                            disabled={loading}
                            className="p-2 text-green-600 dark:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/20 rounded-lg transition disabled:opacity-50"
                            title="บันทึก"
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={() => setEditingFolderId(null)}
                            disabled={loading}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition disabled:opacity-50"
                            title="ยกเลิก"
                          >
                            <X size={18} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingFolderId(folder.id);
                              setEditFolderName(folder.name);
                              setEditFolderDesc(folder.description || "");
                              setEditFolderDept(folder.departmentId || "");
                              setEditFolderParent(folder.parentId || "");
                            }}
                            className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-lg transition"
                            title="แก้ไขแฟ้ม"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setManageAccessModal({ isOpen: true, folderId: folder.id, folderName: folder.name });
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg transition"
                            title="จัดการสิทธิ์การเข้าถึง"
                          >
                            <Shield size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(folder.id, folder.name)}
                            disabled={folder._count.documents > 0}
                            className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            title={folder._count.documents > 0 ? "ไม่สามารถลบแฟ้มที่มีเอกสารอยู่ได้" : "ลบแฟ้ม"}
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-12 text-center">
                  <div className="inline-flex flex-col items-center justify-center text-slate-400 dark:text-white">
                    <Search size={40} className="mb-3 opacity-20" />
                    <p className="text-base font-medium text-slate-500 dark:text-white">
                      ไม่พบแฟ้มที่ค้นหา
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="ยืนยันการลบแฟ้ม"
        message={`คุณแน่ใจหรือไม่ว่าต้องการลบแฟ้ม "${confirmModal.folderName}"?`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmModal({ isOpen: false, folderId: "", folderName: "" })}
      />

      <FolderAccessModal
        isOpen={manageAccessModal.isOpen}
        onClose={() => setManageAccessModal({ ...manageAccessModal, isOpen: false })}
        folderId={manageAccessModal.folderId}
        folderName={manageAccessModal.folderName}
      />
    </div>
  );
}

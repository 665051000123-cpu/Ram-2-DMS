'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, FileText, Download, Eye, Calendar, Tag, Trash2, Filter, Edit, Star, CheckCircle, XCircle, Folder, LayoutGrid, List, ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import { format, isToday, isThisWeek, isThisMonth } from 'date-fns';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import ConfirmModal from './ConfirmModal';

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
  versions?: { version: number; fileUrl: string; fileType: string; createdAt: Date }[];
  createdAt: Date;
  updatedAt?: Date;
  uploader: {
    name: string;
  };
  department?: {
    name: string;
  };
};

export default function DocumentList({ initialDocuments, currentUserId, currentUserRole, departments = [] }: { 
  initialDocuments: Document[],
  currentUserId: string,
  currentUserRole: string,
  departments?: { id: string, name: string }[]
}) {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  
  const [viewMode, setViewMode] = useState<'folder' | 'list'>('folder');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, docId: string, docTitle: string}>({
    isOpen: false, docId: '', docTitle: ''
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
    isOpen: false, docId: '', title: '', description: '', tags: '', documentType: '', visibility: 'DEPARTMENT', file: null
  });
  const [isEditing, setIsEditing] = useState(false);
  
  const [viewModal, setViewModal] = useState<{isOpen: boolean, url: string, title: string}>({
    isOpen: false, url: '', title: ''
  });

  const [historyModal, setHistoryModal] = useState<{isOpen: boolean, doc: Document | null}>({
    isOpen: false, doc: null
  });
  
  const [savedDocTypes, setSavedDocTypes] = useState<string[]>([
    'แบบฟอร์ม', 'ประกาศ', 'แนวทางปฏิบัติ', 'ระเบียบการ', 'อื่นๆ'
  ]);

  useEffect(() => {
    const loadedDocTypes = localStorage.getItem('dms_saved_doctypes');
    if (loadedDocTypes) {
      setSavedDocTypes(JSON.parse(loadedDocTypes));
    }
  }, []);

  const handleSaveEditDocType = () => {
    if (!editModal.documentType.trim()) return;
    const newType = editModal.documentType.trim();
    if (!savedDocTypes.includes(newType)) {
      const updatedTypes = [...savedDocTypes, newType];
      setSavedDocTypes(updatedTypes);
      localStorage.setItem('dms_saved_doctypes', JSON.stringify(updatedTypes));
      toast.success('บันทึกประเภทเอกสารใหม่เรียบร้อยแล้ว');
    } else {
      toast.success('มีประเภทเอกสารนี้อยู่แล้ว');
    }
  };
  
  const folders = useMemo(() => {
    const deptMap = new Map<string, number>();
    documents.forEach(doc => {
      const deptName = doc.department?.name || 'ทั่วไป / ไม่ระบุแผนก';
      deptMap.set(deptName, (deptMap.get(deptName) || 0) + 1);
    });
    return Array.from(deptMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => {
        if (a.name === 'ทั่วไป / ไม่ระบุแผนก') return 1;
        if (b.name === 'ทั่วไป / ไม่ระบุแผนก') return -1;
        return a.name.localeCompare(b.name);
      });
  }, [documents]);

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      // If a folder is selected, filter by that folder exactly
      if (selectedFolder) {
        const docDept = doc.department?.name || 'ทั่วไป / ไม่ระบุแผนก';
        if (docDept !== selectedFolder) return false;
      }

      // Text search
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = doc.title.toLowerCase().includes(searchLower) || doc.tags.toLowerCase().includes(searchLower);
      
      // Department filter
      const matchesDept = filterDepartment === 'ALL' || doc.department?.name === filterDepartment;
      
      // Type filter
      const matchesType = filterType === 'ALL' || doc.documentType === filterType;

      // Date filter
      let matchesDate = true;
      if (filterDate) {
        const docDate = format(new Date(doc.createdAt), 'yyyy-MM-dd');
        matchesDate = docDate === filterDate;
      }
      
      return matchesSearch && matchesDept && matchesDate && matchesType;
    });
  }, [documents, searchTerm, filterDate, filterDepartment, filterType, viewMode, selectedFolder]);

  const handleToggleStar = async (docId: string, isCurrentlyFavorited: boolean) => {
    try {
      const res = await fetch('/api/documents/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docId })
      });
      if (res.ok) {
        const { favorited } = await res.json();
        setDocuments(documents.map(d => {
          if (d.id === docId) {
            const newFavs = favorited 
              ? [...(d.favoritedBy || []), { userId: currentUserId }]
              : (d.favoritedBy || []).filter(f => f.userId !== currentUserId);
            return { ...d, favoritedBy: newFavs };
          }
          return d;
        }));
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
    setConfirmModal({ isOpen: false, docId: '', docTitle: '' });

    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Delete failed');
      
      setDocuments(documents.filter(d => d.id !== docId));
      toast.success('ลบเอกสารสำเร็จ');
    } catch (error) {
      toast.error('ไม่สามารถลบเอกสารได้ หรือคุณไม่มีสิทธิ์');
    }
  };

  const handleEditClick = (doc: Document) => {
    setEditModal({
      isOpen: true,
      docId: doc.id,
      title: doc.title,
      description: doc.description || '',
      tags: doc.tags || '',
      documentType: doc.documentType || '',
      visibility: doc.visibility || 'DEPARTMENT',
      file: null
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(true);

    try {
      const formData = new FormData();
      formData.append('title', editModal.title);
      formData.append('description', editModal.description);
      formData.append('tags', editModal.tags);
      formData.append('documentType', editModal.documentType);
      formData.append('visibility', editModal.visibility);
      if (editModal.file) {
        formData.append('file', editModal.file);
      }

      const res = await fetch(`/api/documents/${editModal.docId}`, {
        method: 'PUT',
        body: formData
      });

      if (!res.ok) {
        throw new Error('Update failed');
      }

      const { document: updatedDoc } = await res.json();
      
      setDocuments(documents.map(d => 
        d.id === editModal.docId ? { ...d, ...updatedDoc } : d
      ));
      
      toast.success('อัปเดตข้อมูลเอกสารสำเร็จ');
      setEditModal({ ...editModal, isOpen: false });
    } catch (error) {
      toast.error('ไม่สามารถแก้ไขเอกสารได้');
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      
      {/* 1. ส่วนหัวและสลับมุมมอง */}
      <div className="p-4 md:p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            {viewMode === 'folder' && !selectedFolder ? 'หมวดหมู่เอกสาร' : 'รายการเอกสาร'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {viewMode === 'folder' && !selectedFolder 
              ? `พบ ${folders.length} แผนกหมวดหมู่`
              : `พบเอกสารทั้งหมด ${filteredDocs.length} รายการ`
            }
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-200 p-1 rounded-xl">
          <button
            onClick={() => { setViewMode('folder'); setSelectedFolder(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'folder' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-300/50'
            }`}
          >
            <LayoutGrid size={16} /> โฟลเดอร์
          </button>
          <button
            onClick={() => { setViewMode('list'); setSelectedFolder(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-300/50'
            }`}
          >
            <List size={16} /> รายการทั้งหมด
          </button>
        </div>
      </div>
        
      {/* 2. เนื้อหา (Folder Grid OR Document List) */}
      
      {viewMode === 'folder' && !selectedFolder ? (
        // ================= FOLDER GRID VIEW =================
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {folders.map(folder => (
              <button
                key={folder.name}
                onClick={() => setSelectedFolder(folder.name)}
                className="flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-2xl hover:border-blue-300 hover:shadow-md hover:bg-blue-50/30 transition-all group"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Folder size={32} fill="currentColor" className="opacity-20 absolute" />
                  <Folder size={32} className="relative z-10" />
                </div>
                <h3 className="font-bold text-slate-800 text-center line-clamp-1">{folder.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{folder.count} เอกสาร</p>
              </button>
            ))}
          </div>
          {folders.length === 0 && (
            <div className="py-16 text-center text-slate-400">
              <Folder size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">ไม่มีหมวดหมู่เอกสาร</p>
            </div>
          )}
        </div>
      ) : (
        // ================= DOCUMENT LIST VIEW =================
        <>
          {/* Filters Toolbar */}
          <div className="p-4 border-b border-slate-200 bg-white flex flex-col md:flex-row gap-4 items-center">
            
            {selectedFolder && (
              <button 
                onClick={() => setSelectedFolder(null)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition whitespace-nowrap"
              >
                <ArrowLeft size={18} />
                กลับไปโฟลเดอร์
              </button>
            )}

            {/* Search */}
            <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="ค้นหาชื่อเอกสาร หรือ Tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm"
          />
        </div>

        {/* Document Type Filter */}
        <div className="md:w-48 relative">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm appearance-none"
          >
            <option value="ALL">ทุกประเภท</option>
            {savedDocTypes.map((type, idx) => (
              <option key={idx} value={type}>{type}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FileText className="h-4 w-4 text-slate-400" />
          </div>
        </div>

        {/* Date Filter */}
        <div className="md:w-48 relative">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Calendar className="h-4 w-4 text-slate-400" />
          </div>
        </div>

        {/* Department Filter (Only for SUPER_ADMIN) */}
        {currentUserRole === 'SUPER_ADMIN' && departments.length > 0 && (
          <div className="md:w-48 relative">
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm appearance-none"
            >
              <option value="ALL">แผนกทั้งหมด</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.name}>{dept.name}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        )}
      </div>

      {/* 2. ตารางแสดงเอกสาร */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
              <th className="font-semibold py-4 px-6">ชื่อเอกสาร</th>
              <th className="font-semibold py-4 px-6">Tags</th>
              {currentUserRole === 'SUPER_ADMIN' && (
                <th className="font-semibold py-4 px-6">แผนก</th>
              )}
              <th className="font-semibold py-4 px-6">ผู้อัปโหลด</th>
              <th className="font-semibold py-4 px-6">วันที่</th>
              <th className="font-semibold py-4 px-6 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredDocs.length > 0 ? (
              (() => {
                const groups = new Map<string, typeof documents>();
                filteredDocs.forEach(doc => {
                  const deptName = doc.department?.name || 'ทั่วไป / ไม่ระบุแผนก';
                  if (!groups.has(deptName)) groups.set(deptName, []);
                  groups.get(deptName)!.push(doc);
                });
                
                const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
                  if (a[0] === 'ทั่วไป / ไม่ระบุแผนก') return 1;
                  if (b[0] === 'ทั่วไป / ไม่ระบุแผนก') return -1;
                  return a[0].localeCompare(b[0]);
                });

                return sortedGroups.map(([deptName, groupDocs]) => {
                  const isSearching = searchTerm.trim().length > 0;
                  
                  return (
                  <React.Fragment key={deptName}>
                    {!selectedFolder && (
                      <tr 
                        className="bg-slate-100/70 hover:bg-slate-200/70 cursor-pointer transition-colors"
                        onClick={() => setSelectedFolder(deptName)}
                      >
                        <td colSpan={currentUserRole === 'SUPER_ADMIN' ? 6 : 5} className="py-4 px-6 font-bold text-slate-700 text-sm border-y border-slate-200/50">
                          <div className="flex items-center gap-3">
                            <Folder size={20} className="text-blue-600" />
                            {deptName}
                            <span className="text-xs font-normal text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 shadow-sm">
                              {groupDocs.length} รายการ
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {(selectedFolder || (isSearching && !selectedFolder)) && groupDocs.map((doc) => {
                      const isFavorited = doc.favoritedBy?.some(f => f.userId === currentUserId) || false;
                      
                      return (
                      <tr key={doc.id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="py-4 px-6">
                    <div className="flex items-start gap-3">
                      <button 
                        onClick={() => handleToggleStar(doc.id, isFavorited)}
                        className={`mt-1 p-1 rounded-full transition-colors ${isFavorited ? 'text-yellow-400 hover:text-yellow-500 hover:bg-yellow-50' : 'text-slate-300 hover:text-yellow-400 hover:bg-yellow-50'}`}
                      >
                        <Star size={20} fill={isFavorited ? "currentColor" : "none"} />
                      </button>
                      <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <FileText size={20} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 flex items-center gap-2">
                          {doc.title}
                          {doc.currentVersion && doc.currentVersion > 1 && (
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                              V{doc.currentVersion}.0
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{doc.description || '-'}</p>
                        {doc.visibility === 'PRIVATE' && (
                          <div className="mt-1">
                            <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">ส่วนตัว</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col gap-1.5">
                      {doc.documentType && (
                        <span className="inline-flex w-fit items-center px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100">
                          {doc.documentType}
                        </span>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {doc.tags.split(',').filter(t => t.trim() !== '').map((tag, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            <Tag size={12} />
                            {tag.trim()}
                          </span>
                        ))}
                        {!doc.tags && !doc.documentType && <span className="text-sm text-slate-400">-</span>}
                      </div>
                    </div>
                  </td>
                  {currentUserRole === 'SUPER_ADMIN' && (
                    <td className="py-4 px-6">
                      <div className="text-sm font-medium text-slate-600">
                        {doc.department?.name || '-'}
                      </div>
                    </td>
                  )}
                  <td className="py-4 px-6">
                    <div className="text-sm font-medium text-slate-700">{doc.uploader.name}</div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      <Calendar size={14} className="text-slate-400" />
                      {format(new Date(doc.createdAt), 'dd/MM/yyyy HH:mm')}
                    </div>
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      {doc.fileType === 'application/pdf' ? (
                        <button 
                          onClick={() => setViewModal({ isOpen: true, url: `/api/documents/${doc.id}/download?view=true`, title: doc.title })}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                          title="ดูเอกสาร"
                        >
                          <Eye size={18} />
                        </button>
                      ) : (
                        <a 
                          href={`/api/documents/${doc.id}/download?view=true`} 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                          title="ดูเอกสาร"
                        >
                          <Eye size={18} />
                        </a>
                      )}
                      <a 
                        href={`/api/documents/${doc.id}/download`}
                        download
                        className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                        title="ดาวน์โหลด"
                      >
                        <Download size={18} />
                      </a>

                      {doc.versions && doc.versions.length > 0 && (
                        <button 
                          onClick={() => setHistoryModal({ isOpen: true, doc })}
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="ประวัติเวอร์ชัน"
                        >
                          <Calendar size={18} />
                        </button>
                      )}

                      {(doc.uploader.name === currentUserId || currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'DEPARTMENT_HEAD') && (
                        <>
                          <button 
                            onClick={() => handleEditClick(doc)}
                            className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition"
                            title="แก้ไขข้อมูลเอกสาร"
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(doc.id, doc.title)}
                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="ลบเอกสาร"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
              </React.Fragment>
            );
            })
            })()
            ) : (
              <tr>
                <td colSpan={currentUserRole === 'SUPER_ADMIN' ? 6 : 5} className="py-16 text-center">
                  <div className="inline-flex flex-col items-center justify-center text-slate-400">
                    <Search size={48} className="mb-4 opacity-20" />
                    <p className="text-lg font-medium">ไม่พบเอกสาร</p>
                    <p className="text-sm mt-1">ลองเปลี่ยนคำค้นหา หรืออัปโหลดเอกสารใหม่</p>
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
        onCancel={() => setConfirmModal({ isOpen: false, docId: '', docTitle: '' })}
      />

      {/* Edit Modal */}
      {editModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
              <Edit className="text-slate-400" size={20} />
              <h3 className="text-xl font-bold text-slate-800">แก้ไขข้อมูลเอกสาร</h3>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อเอกสาร</label>
                <input
                  type="text"
                  required
                  value={editModal.title}
                  onChange={e => setEditModal({ ...editModal, title: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">คำอธิบาย</label>
                <textarea
                  rows={2}
                  value={editModal.description}
                  onChange={e => setEditModal({ ...editModal, description: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ประเภทเอกสาร</label>
                <div className="flex gap-2">
                  <input
                    list="editDocTypesList"
                    value={editModal.documentType}
                    onChange={e => setEditModal({ ...editModal, documentType: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition whitespace-nowrap shrink-0"
                  >
                    บันทึก
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">สิทธิ์การเข้าถึง (Visibility)</label>
                <select
                  value={editModal.visibility}
                  onChange={e => setEditModal({ ...editModal, visibility: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="DEPARTMENT">เห็นเฉพาะคนในแผนก (DEPARTMENT)</option>
                  <option value="PUBLIC">เห็นได้ทุกแผนก (PUBLIC)</option>
                  <option value="PRIVATE">ส่วนตัว (PRIVATE)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tags (คั่นด้วยลูกน้ำ)</label>
                <input
                  type="text"
                  value={editModal.tags}
                  onChange={e => setEditModal({ ...editModal, tags: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="เช่น ระเบียบการ, 2567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">อัปโหลดไฟล์เวอร์ชันใหม่ (ถ้ามี)</label>
                <input
                  type="file"
                  onChange={e => setEditModal({ ...editModal, file: e.target.files?.[0] || null })}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditModal({ ...editModal, isOpen: false })}
                  className="flex-1 py-2.5 text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="flex-1 py-2.5 text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition font-medium disabled:opacity-50"
                >
                  {isEditing ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View PDF Modal */}
      {viewModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/80 flex flex-col items-center justify-center z-[60] p-4">
          <div className="w-full max-w-5xl bg-white rounded-t-xl p-4 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <FileText className="text-blue-600" />
              {viewModal.title}
            </h3>
            <button 
              onClick={() => setViewModal({ isOpen: false, url: '', title: '' })}
              className="p-2 text-slate-400 hover:bg-slate-100 hover:text-red-500 rounded-lg transition"
            >
              <XCircle size={24} />
            </button>
          </div>
          <div className="w-full max-w-5xl h-[80vh] bg-slate-100 rounded-b-xl overflow-hidden">
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Calendar className="text-indigo-500" size={24} />
                <h3 className="text-xl font-bold text-slate-800">ประวัติเวอร์ชันของเอกสาร</h3>
              </div>
              <button 
                onClick={() => setHistoryModal({ isOpen: false, doc: null })}
                className="p-2 text-slate-400 hover:bg-slate-200 hover:text-red-500 rounded-lg transition"
              >
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <p className="text-slate-800 font-semibold mb-4 text-lg border-b pb-2">{historyModal.doc.title}</p>
              
              <div className="space-y-4">
                {/* Current Version */}
                <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <div>
                    <span className="inline-block px-2.5 py-1 bg-emerald-200 text-emerald-800 rounded text-xs font-bold mb-1">
                      เวอร์ชันปัจจุบัน (V{historyModal.doc.currentVersion}.0)
                    </span>
                    <p className="text-sm text-slate-600">อัปโหลดล่าสุด: {format(new Date(historyModal.doc.updatedAt || historyModal.doc.createdAt), 'dd/MM/yyyy HH:mm')}</p>
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
                  <div key={v.version} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div>
                      <span className="inline-block px-2.5 py-1 bg-slate-200 text-slate-700 rounded text-xs font-bold mb-1">
                        เวอร์ชัน {v.version}.0
                      </span>
                      <p className="text-sm text-slate-600">อัปโหลดเมื่อ: {format(new Date(v.createdAt), 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                    <div className="flex gap-2">
                      <a 
                        href={v.fileUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-medium rounded-lg transition flex items-center gap-2"
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
    </div>
  );
}

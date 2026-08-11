"use client";

import React, { useState, useEffect } from "react";
import { Link as LinkIcon, XCircle, Search, Unlink, FileText, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

type LinkedDoc = {
  linkId: string;
  document: {
    id: string;
    title: string;
    documentCode: string | null;
    documentType: string | null;
  };
};

export default function DocumentLinkModal({
  isOpen,
  docId,
  docTitle,
  onClose,
}: {
  isOpen: boolean;
  docId: string;
  docTitle: string;
  onClose: () => void;
}) {
  const [links, setLinks] = useState<LinkedDoc[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  
  const [linkingTo, setLinkingTo] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && docId) {
      fetchLinks();
    }
  }, [isOpen, docId]);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${docId}/links`);
      if (res.ok) {
        const data = await res.json();
        setLinks(data.links || []);
      }
    } catch (error) {
      toast.error("ดึงข้อมูลการเชื่อมโยงไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const res = await fetch(`/api/documents/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        const docRes = await fetch(`/api/documents`);
        if (docRes.ok) {
          const docData = await docRes.json();
          let allDocs = docData.documents || [];
          
          if (data.documentIds && data.documentIds.length > 0) {
             allDocs = allDocs.filter((d: any) => data.documentIds.includes(d.id));
          } else {
             // fallback basic filter
             allDocs = allDocs.filter((d: any) => 
               d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
               (d.documentCode && d.documentCode.toLowerCase().includes(searchQuery.toLowerCase()))
             );
          }
          
          // filter out self and already linked
          const availableDocs = allDocs.filter((d: any) => 
             d.id !== docId && 
             !links.some(l => l.document.id === d.id)
          );
          
          setSearchResults(availableDocs);
        }
      }
    } catch (error) {
      toast.error("ค้นหาเอกสารไม่สำเร็จ");
    } finally {
      setSearching(false);
    }
  };

  const handleLinkDocument = async (targetId: string) => {
    setLinkingTo(targetId);
    try {
      const res = await fetch(`/api/documents/${docId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId })
      });
      
      if (res.ok) {
        toast.success("เชื่อมโยงเอกสารสำเร็จ");
        setSearchQuery("");
        setSearchResults([]);
        fetchLinks();
      } else {
        const data = await res.json();
        toast.error(data.error || "เกิดข้อผิดพลาด");
      }
    } catch (error) {
      toast.error("เชื่อมโยงเอกสารไม่สำเร็จ");
    } finally {
      setLinkingTo(null);
    }
  };

  const handleUnlink = async (linkId: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการเชื่อมโยงเอกสารนี้?")) return;
    
    try {
      const res = await fetch(`/api/documents/${docId}/links?linkId=${linkId}`, {
        method: "DELETE"
      });
      
      if (res.ok) {
        toast.success("ยกเลิกการเชื่อมโยงสำเร็จ");
        fetchLinks();
      } else {
        toast.error("เกิดข้อผิดพลาด");
      }
    } catch (error) {
      toast.error("ยกเลิกการเชื่อมโยงไม่สำเร็จ");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex flex-col items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <LinkIcon size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                เชื่อมโยงเอกสาร
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">
                สำหรับเอกสาร: <span className="font-semibold text-slate-700 dark:text-slate-300">{docTitle}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-red-500 rounded-lg transition"
          >
            <XCircle size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Linked Documents List */}
          <section>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <FileText size={16} className="text-slate-400" />
              เอกสารที่เชื่อมโยงไว้แล้ว ({links.length})
            </h4>
            
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 size={24} className="animate-spin text-indigo-500" />
              </div>
            ) : links.length > 0 ? (
              <div className="space-y-3">
                {links.map(link => (
                  <div key={link.linkId} className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0">
                        <LinkIcon size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                          {link.document.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {link.document.documentCode || 'ไม่มีรหัส'} • {link.document.documentType || 'ทั่วไป'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnlink(link.linkId)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition shrink-0"
                      title="ยกเลิกการเชื่อมโยง"
                    >
                      <Unlink size={18} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                <p className="text-sm text-slate-500 dark:text-slate-400">ยังไม่มีเอกสารอ้างอิง</p>
              </div>
            )}
          </section>

          {/* Search to Link New */}
          <section>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Search size={16} className="text-slate-400" />
              ค้นหาเอกสารเพื่อผูกเพิ่ม
            </h4>
            
            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อ หรือ รหัสเอกสาร..."
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <button 
                type="submit"
                disabled={searching || !searchQuery.trim()}
                className="px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-xl hover:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50 transition"
              >
                {searching ? <Loader2 size={20} className="animate-spin" /> : "ค้นหา"}
              </button>
            </form>
            
            {searchResults.length > 0 && (
              <div className="space-y-3 mt-4">
                {searchResults.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
                    <div className="min-w-0 pr-4">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                        {doc.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {doc.documentCode || 'ไม่มีรหัส'} • {doc.department?.name || 'ไม่มีแผนก'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleLinkDocument(doc.id)}
                      disabled={linkingTo === doc.id}
                      className="shrink-0 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-xs font-semibold rounded-lg transition"
                    >
                      {linkingTo === doc.id ? "กำลังผูก..." : "+ ผูกเอกสาร"}
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {searchQuery && searchResults.length === 0 && !searching && (
              <p className="text-sm text-center text-slate-500 mt-4">ไม่พบเอกสารที่สามารถผูกได้</p>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}

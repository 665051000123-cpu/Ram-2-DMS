"use client";

import React, { useState, useEffect } from "react";
import { Globe, XCircle, Save, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

type DocumentVisibilityModalProps = {
  isOpen: boolean;
  docId: string;
  docTitle: string;
  onClose: () => void;
};

export default function DocumentVisibilityModal({
  isOpen,
  docId,
  docTitle,
  onClose,
}: DocumentVisibilityModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [visibility, setVisibility] = useState<"PRIVATE" | "PUBLIC" | "CUSTOM">("PRIVATE");
  const [sharedDepartments, setSharedDepartments] = useState<string[]>([]);
  const [allDepartments, setAllDepartments] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (isOpen && docId) {
      fetchData();
    }
  }, [isOpen, docId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [visibilityRes, deptsRes] = await Promise.all([
        fetch(`/api/documents/${docId}/visibility`),
        fetch("/api/departments")
      ]);

      if (visibilityRes.ok) {
        const visData = await visibilityRes.json();
        setVisibility(visData.visibility || "PRIVATE");
        setSharedDepartments(visData.sharedDepartments || []);
      }

      if (deptsRes.ok) {
        const deptsData = await deptsRes.json();
        setAllDepartments(deptsData || []);
      }
    } catch (error) {
      toast.error("ดึงข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${docId}/visibility`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility, sharedDepartments }),
      });

      if (res.ok) {
        toast.success("อัปเดตการมองเห็นเอกสารสำเร็จ");
        onClose();
      } else {
        const data = await res.json();
        toast.error(data.error || "เกิดข้อผิดพลาดในการอัปเดต");
      }
    } catch (error) {
      toast.error("อัปเดตไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex flex-col items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Globe size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                การจัดการการมองเห็น (Visibility)
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

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 size={24} className="animate-spin text-emerald-500" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition-colors ${visibility === 'PRIVATE' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'}`}>
                  <input type="radio" name="visibility" value="PRIVATE" checked={visibility === 'PRIVATE'} onChange={() => setVisibility('PRIVATE')} className="hidden" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">ส่วนตัวแผนก (Private)</span>
                    <span className="text-xs opacity-70">เห็นได้เฉพาะคนในแผนก</span>
                  </div>
                </label>
                <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition-colors ${visibility === 'PUBLIC' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'}`}>
                  <input type="radio" name="visibility" value="PUBLIC" checked={visibility === 'PUBLIC'} onChange={() => setVisibility('PUBLIC')} className="hidden" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">สาธารณะ (Public)</span>
                    <span className="text-xs opacity-70">ทุกคนในบริษัทเห็นได้</span>
                  </div>
                </label>
                <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition-colors ${visibility === 'CUSTOM' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'}`}>
                  <input type="radio" name="visibility" value="CUSTOM" checked={visibility === 'CUSTOM'} onChange={() => setVisibility('CUSTOM')} className="hidden" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">แชร์แผนกอื่น (Custom)</span>
                    <span className="text-xs opacity-70">เลือกแผนกที่จะให้เห็นได้</span>
                  </div>
                </label>
              </div>

              {visibility === 'CUSTOM' && (
                <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">เลือกแผนกที่คุณต้องการแชร์ไฟล์นี้ให้เห็น:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                        />
                        <span className="text-sm text-slate-600 dark:text-slate-400">{dept.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg flex items-center gap-2 transition"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}

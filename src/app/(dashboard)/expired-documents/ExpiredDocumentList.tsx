"use client";

import { useState } from "react";
import { format } from "date-fns";
import { FileText, Trash, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/ConfirmModal";

export default function ExpiredDocumentList({
  initialDocuments,
}: {
  initialDocuments: any[];
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    docId: string;
    action: "SOFT_DELETE" | "HARD_DELETE" | null;
  }>({
    isOpen: false,
    docId: "",
    action: null,
  });

  const handleAction = async () => {
    const { docId, action } = confirmModal;
    setConfirmModal({ isOpen: false, docId: "", action: null });

    if (!docId || !action) return;

    try {
      let url = `/api/documents/${docId}`;
      if (action === "HARD_DELETE") {
        url = `/api/documents/${docId}/hard-delete`;
      }

      const res = await fetch(url, { method: "DELETE" });

      if (!res.ok) throw new Error(`${action} failed`);

      setDocuments(documents.filter((d) => d.id !== docId));
      toast.success(
        action === "SOFT_DELETE" ? "ย้ายเอกสารไปที่ถังขยะแล้ว" : "ลบเอกสารแบบถาวรสำเร็จ",
      );
    } catch (error) {
      toast.error("ทำรายการไม่สำเร็จ");
    }
  };

  if (documents.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 p-12 text-center text-slate-500 dark:text-white">
        <FileText size={48} className="mx-auto mb-4 opacity-20" />
        <p className="text-lg font-medium">ไม่มีเอกสารหมดอายุ</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-white text-sm border-b border-slate-200 dark:border-slate-600">
            <th className="font-semibold py-4 px-6">ชื่อเอกสาร</th>
            <th className="font-semibold py-4 px-6">ผู้อัปโหลด</th>
            <th className="font-semibold py-4 px-6">รหัสเอกสาร</th>
            <th className="font-semibold py-4 px-6">วันที่หมดอายุ</th>
            <th className="font-semibold py-4 px-6 text-center">จัดการ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {documents.map((doc) => (
            <tr
              key={doc.id}
              className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
            >
              <td className="py-4 px-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-500/20 text-orange-500 flex items-center justify-center shrink-0">
                    <FileText size={20} />
                  </div>
                  <p className="font-semibold text-slate-800 dark:text-white">
                    {doc.title}
                  </p>
                </div>
              </td>
              <td className="py-4 px-6">
                <div className="text-sm font-medium text-slate-700 dark:text-white">
                  {doc.uploader.name}
                </div>
              </td>
              <td className="py-4 px-6">
                <div className="text-sm font-medium text-slate-600 dark:text-white">
                  {doc.documentCode || "-"}
                </div>
              </td>
              <td className="py-4 px-6">
                <div className="text-sm text-red-500 font-medium">
                  {doc.retentionPeriod
                    ? format(new Date(doc.retentionPeriod), "dd/MM/yyyy")
                    : "-"}
                </div>
              </td>
              <td className="py-4 px-6">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() =>
                      setConfirmModal({
                        isOpen: true,
                        docId: doc.id,
                        action: "SOFT_DELETE",
                      })
                    }
                    className="p-2 text-orange-500 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-500/20 rounded-lg transition"
                    title="ลบไปที่ถังขยะ"
                  >
                    <Trash size={18} />
                  </button>
                  <button
                    onClick={() =>
                      setConfirmModal({
                        isOpen: true,
                        docId: doc.id,
                        action: "HARD_DELETE",
                      })
                    }
                    className="p-2 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-lg transition"
                    title="ลบถาวร"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={
          confirmModal.action === "SOFT_DELETE"
            ? "ยืนยันการลบไปที่ถังขยะ"
            : "ยืนยันการลบถาวร"
        }
        message={
          confirmModal.action === "SOFT_DELETE"
            ? "เอกสารจะถูกส่งไปยังถังขยะ คุณแน่ใจหรือไม่?"
            : "การลบนี้จะไม่สามารถกู้คืนได้อีกเลย (ไฟล์ถูกลบออกจาก Server ถาวร) คุณแน่ใจหรือไม่?"
        }
        onConfirm={handleAction}
        onCancel={() =>
          setConfirmModal({ isOpen: false, docId: "", action: null })
        }
      />
    </div>
  );
}

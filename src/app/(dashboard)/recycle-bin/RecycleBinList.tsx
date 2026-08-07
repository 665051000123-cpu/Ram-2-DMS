"use client";

import { useState } from "react";
import { format } from "date-fns";
import { FileText, RefreshCcw, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/ConfirmModal";

export default function RecycleBinList({
  initialDocuments,
}: {
  initialDocuments: any[];
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    docId: string;
    action: "RESTORE" | "HARD_DELETE" | null;
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
      const url = `/api/documents/${docId}/${action === "RESTORE" ? "restore" : "hard-delete"}`;
      const method = action === "RESTORE" ? "POST" : "DELETE";

      const res = await fetch(url, { method });

      if (!res.ok) throw new Error(`${action} failed`);

      setDocuments(documents.filter((d) => d.id !== docId));
      toast.success(
        action === "RESTORE" ? "กู้คืนเอกสารสำเร็จ" : "ลบเอกสารแบบถาวรสำเร็จ",
      );
    } catch (error) {
      toast.error("ทำรายการไม่สำเร็จ");
    }
  };

  if (documents.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 p-12 text-center text-slate-500 dark:text-white">
        <Trash2 size={48} className="mx-auto mb-4 opacity-20" />
        <p className="text-lg font-medium">ถังขยะว่างเปล่า</p>
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
            <th className="font-semibold py-4 px-6">แผนก</th>
            <th className="font-semibold py-4 px-6">วันที่ลบ</th>
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
                  <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-500/20 text-red-500 flex items-center justify-center shrink-0">
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
                  {doc.department.name}
                </div>
              </td>
              <td className="py-4 px-6">
                <div className="text-sm text-red-500 font-medium">
                  {doc.deletedAt
                    ? format(new Date(doc.deletedAt), "dd/MM/yyyy HH:mm")
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
                        action: "RESTORE",
                      })
                    }
                    className="p-2 text-blue-500 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-lg transition"
                    title="กู้คืนเอกสาร"
                  >
                    <RefreshCcw size={18} />
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
          confirmModal.action === "RESTORE"
            ? "ยืนยันการกู้คืน"
            : "ยืนยันการลบถาวร"
        }
        message={
          confirmModal.action === "RESTORE"
            ? "เอกสารจะถูกกู้คืนกลับไปยังแผนกเดิม คุณแน่ใจหรือไม่?"
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

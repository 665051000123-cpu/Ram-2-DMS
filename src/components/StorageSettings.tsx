"use client";

import React, { useState, useEffect } from "react";
import { Save, HardDrive, AlertTriangle } from "lucide-react";

export default function StorageSettings() {
  const [uploadDir, setUploadDir] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setUploadDir(data.uploadDir || "");
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadDir }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: "บันทึกการตั้งค่าสำเร็จ" });
      } else {
        setMessage({
          type: "error",
          text: data.error || "เกิดข้อผิดพลาดในการบันทึก",
        });
      }
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-white dark:bg-slate-900 transition-colors p-6 rounded-xl border border-slate-200 dark:border-slate-600 h-32"></div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 transition-colors rounded-xl shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-slate-600 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-300 shrink-0">
          <HardDrive size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
            ที่เก็บเอกสาร (Storage Directory)
          </h2>
          <p className="text-sm text-slate-500 dark:text-white">
            กำหนดพาธ (Path) เริ่มต้นที่ต้องการจัดเก็บไฟล์เอกสารทั้งหมด
          </p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-yellow-50 dark:bg-yellow-500/20 border border-yellow-200 dark:border-yellow-500/30 rounded-lg p-4 flex gap-3 text-yellow-800 dark:text-yellow-200">
          <AlertTriangle className="shrink-0 mt-0.5 text-yellow-600 dark:text-yellow-400" size={18} />
          <div className="text-sm">
            <strong className="text-yellow-900 dark:text-yellow-100">ข้อควรระวัง:</strong> หากมีการเปลี่ยนแปลงโฟลเดอร์เก็บเอกสาร
            ระบบจะใช้โฟลเดอร์ใหม่ในการบันทึกและอ่านไฟล์
            <strong className="text-yellow-900 dark:text-yellow-100">
              คุณจะต้องย้ายไฟล์เดิมจากโฟลเดอร์เก่าไปยังโฟลเดอร์ใหม่ด้วยตัวเอง
            </strong>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-white mb-2">
            Upload Directory Path (เช่น D:\DMS_Uploads)
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={uploadDir}
              onChange={(e) => setUploadDir(e.target.value)}
              placeholder="C:\dms_files หรือ /var/www/uploads"
              className="flex-1 rounded-lg border-slate-200 dark:border-slate-600 border p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <button
              onClick={handleSave}
              disabled={saving || !uploadDir.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
          {message.text && (
            <p
              className={`mt-2 text-sm ${message.type === "success" ? "text-green-600" : "text-red-600 dark:text-red-300"}`}
            >
              {message.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

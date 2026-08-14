"use client";

import { useState, useEffect } from "react";
import { Save, Shield, Clock, Trash2, Activity } from "lucide-react";
import toast from "react-hot-toast";

export default function SecuritySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [recycleBinRetention, setRecycleBinRetention] = useState("30");
  const [auditLogRetention, setAuditLogRetention] = useState("90");

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSessionTimeout(data.SESSION_TIMEOUT_MINUTES || "30");
        setRecycleBinRetention(data.RECYCLE_BIN_RETENTION_DAYS || "30");
        setAuditLogRetention(data.AUDIT_LOG_RETENTION_DAYS || "90");
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            SESSION_TIMEOUT_MINUTES: sessionTimeout,
            RECYCLE_BIN_RETENTION_DAYS: recycleBinRetention,
            AUDIT_LOG_RETENTION_DAYS: auditLogRetention,
          },
        }),
      });

      if (!res.ok) throw new Error("Failed to save settings");

      setMessage({
        type: "success",
        text: "บันทึกการตั้งค่าความปลอดภัยเรียบร้อยแล้ว",
      });
      toast.success("บันทึกการตั้งค่าเรียบร้อยแล้ว");
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
      toast.error(error.message);
    } finally {
      setSaving(false);
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 animate-pulse">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-4"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-8"></div>
        <div className="space-y-4">
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
          <Shield size={24} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">
          ความปลอดภัยและนโยบายการเก็บรักษา (Security & Retention)
        </h2>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        ตั้งค่าระยะเวลาการทำงานของระบบ การลบข้อมูลอัตโนมัติ และเซสชันการเข้าสู่ระบบ
      </p>

      <div className="space-y-8">
        {/* Session Timeout */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock size={18} className="text-slate-600 dark:text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">หมดเวลาเชื่อมต่ออัตโนมัติ (Session Timeout)</h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            หากผู้ใช้ไม่มีการเคลื่อนไหวเกินเวลาที่กำหนด ระบบจะทำการออกจากระบบอัตโนมัติเพื่อความปลอดภัย
          </p>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            ระยะเวลาที่อนุญาตให้ไม่มีการเคลื่อนไหว (นาที)
          </label>
          <input
            type="number"
            min="1"
            max="1440"
            value={sessionTimeout}
            onChange={(e) => setSessionTimeout(e.target.value)}
            className="w-full max-w-sm rounded-lg border-slate-200 dark:border-slate-600 border p-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none dark:bg-slate-800 dark:text-white"
          />
        </div>

        <hr className="border-slate-200 dark:border-slate-700" />

        {/* Auto Cleanup Policies */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Trash2 size={18} className="text-slate-600 dark:text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">นโยบายถังขยะอัตโนมัติ (Recycle Bin Auto-Cleanup)</h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            เอกสารและไฟล์ที่ถูกลบไปอยู่ในถังขยะ จะถูกลบทิ้งอย่างถาวรโดยอัตโนมัติเมื่อครบกำหนดเวลา เพื่อคืนพื้นที่ให้เซิร์ฟเวอร์
          </p>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            ระยะเวลาเก็บไฟล์ในถังขยะ (วัน)
          </label>
          <input
            type="number"
            min="1"
            max="365"
            value={recycleBinRetention}
            onChange={(e) => setRecycleBinRetention(e.target.value)}
            className="w-full max-w-sm rounded-lg border-slate-200 dark:border-slate-600 border p-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none dark:bg-slate-800 dark:text-white"
          />
        </div>

        <hr className="border-slate-200 dark:border-slate-700" />

        {/* Audit Log Retention */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Activity size={18} className="text-slate-600 dark:text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">นโยบายประวัติการใช้งาน (Audit Log Retention)</h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            ระยะเวลาในการเก็บรักษาข้อมูลประวัติการใช้งานระบบ (Audit Logs) เพื่อป้องกันฐานข้อมูลใหญ่เกินไป
          </p>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            ระยะเวลาเก็บรักษาประวัติ (วัน)
          </label>
          <input
            type="number"
            min="1"
            max="3650"
            value={auditLogRetention}
            onChange={(e) => setAuditLogRetention(e.target.value)}
            className="w-full max-w-sm rounded-lg border-slate-200 dark:border-slate-600 border p-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>

      <div className="mt-8 flex items-center justify-end">
        {message.text && (
          <p
            className={`mr-4 text-sm ${
              message.type === "success" ? "text-green-600" : "text-red-600"
            }`}
          >
            {message.text}
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
        >
          <Save size={18} />
          {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
        </button>
      </div>
    </div>
  );
}

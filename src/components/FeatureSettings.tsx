"use client";

import React, { useState, useEffect } from "react";
import { Settings, Save, Search, ScanLine, Shield, FileSignature } from "lucide-react";
import toast from "react-hot-toast";

export default function FeatureSettings() {
  const [settings, setSettings] = useState({
    ENABLE_AUTO_OCR: false,
    ENABLE_PDF_WATERMARK: false,
    WATERMARK_TEXT: "Confidential",
    WATERMARK_COLOR: "#66b2e5",
    WATERMARK_OPACITY: "5",
    STRICT_FILE_VALIDATION: false,
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings({
          ENABLE_AUTO_OCR: data.ENABLE_AUTO_OCR === "true",
          ENABLE_PDF_WATERMARK: data.ENABLE_PDF_WATERMARK === "true",
          WATERMARK_TEXT: data.WATERMARK_TEXT || "Confidential",
          WATERMARK_COLOR: data.WATERMARK_COLOR || "#66b2e5",
          WATERMARK_OPACITY: data.WATERMARK_OPACITY || "5",
          STRICT_FILE_VALIDATION: data.STRICT_FILE_VALIDATION === "true",
        });
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });

      if (res.ok) {
        toast.success("บันทึกการตั้งค่าฟีเจอร์สำเร็จ");
      } else {
        const data = await res.json();
        toast.error(data.error || "เกิดข้อผิดพลาดในการบันทึก");
      }
    } catch (error: any) {
      toast.error(error.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-white dark:bg-slate-900 transition-colors p-6 rounded-xl border border-slate-200 dark:border-slate-600 h-64"></div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 transition-colors rounded-xl shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-slate-600 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-300 shrink-0">
            <Settings size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
              ฟีเจอร์ของระบบ (Feature Toggles)
            </h2>
            <p className="text-sm text-slate-500 dark:text-white">
              เปิด-ปิดการใช้งานฟีเจอร์ขั้นสูงและการรักษาความปลอดภัย
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
        >
          <Save size={16} />
          {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Toggle Items */}
        <div className="flex flex-col gap-4">
          
          <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <div className="flex items-start gap-4">
              <div className="mt-1 p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                <ScanLine size={20} />
              </div>
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white">Auto OCR (ดึงข้อความอัตโนมัติ)</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  ระบบจะอ่านและดึงข้อความจากไฟล์ PDF/รูปภาพ อัตโนมัติเมื่ออัปโหลด เพื่อให้สามารถค้นหาแบบ Full-text ได้
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.ENABLE_AUTO_OCR}
                onChange={() => handleToggle("ENABLE_AUTO_OCR")}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex flex-col p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <div className="flex items-start gap-4 w-full">
              <div className="mt-1 p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg shrink-0">
                <FileSignature size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-slate-900 dark:text-white">Dynamic PDF Watermark (ลายน้ำ)</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  ประทับตราลายน้ำระบุชื่อผู้ใช้และเวลา ลงบนไฟล์ PDF ที่เป็นเอกสารส่วนตัว (Private) ตอนกดดูหรือดาวน์โหลด
                </p>
                <div className="mt-4 w-full">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ข้อความลายน้ำ (Watermark Text)</label>
                  <input
                    type="text"
                    value={settings.WATERMARK_TEXT}
                    onChange={(e) => setSettings({ ...settings, WATERMARK_TEXT: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g. Confidential หรือ เอกสารควบคุม"
                  />
                  <p className="text-xs text-slate-500 mt-1 mb-4">ระบบจะทำการต่อท้ายด้วยชื่อผู้ดาวน์โหลด และเวลาให้โดยอัตโนมัติ (เช่น {settings.WATERMARK_TEXT || "Confidential"} - สมชาย - 17/08/2026 10:48)</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">สีของลายน้ำ (Color)</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={settings.WATERMARK_COLOR}
                          onChange={(e) => setSettings({ ...settings, WATERMARK_COLOR: e.target.value })}
                          className="h-10 w-14 rounded-lg cursor-pointer bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 p-1"
                        />
                        <span className="text-sm text-slate-500 font-mono">{settings.WATERMARK_COLOR}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ความเข้มของลายน้ำ (Opacity): {settings.WATERMARK_OPACITY}%</label>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={settings.WATERMARK_OPACITY}
                        onChange={(e) => setSettings({ ...settings, WATERMARK_OPACITY: e.target.value })}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 mt-3"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>



        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { Save, HardDrive, AlertTriangle } from "lucide-react";

export default function StorageSettings() {
  const [uploadDir, setUploadDir] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [maxFileSizeMB, setMaxFileSizeMB] = useState("10");
  const [allowedFileTypes, setAllowedFileTypes] = useState("pdf, jpg, png, jpeg, docx, xlsx");

  // S3 Cloud Backup State
  const [s3Enabled, setS3Enabled] = useState(false);
  const [s3Endpoint, setS3Endpoint] = useState("");
  const [s3Bucket, setS3Bucket] = useState("");
  const [s3Region, setS3Region] = useState("auto");
  const [s3AccessKey, setS3AccessKey] = useState("");
  const [s3SecretKey, setS3SecretKey] = useState("");

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setUploadDir(data.uploadDir || "");
        setS3Enabled(data.s3Enabled === "true");
        setS3Endpoint(data.s3Endpoint || "");
        setS3Bucket(data.s3Bucket || "");
        setS3Region(data.s3Region || "auto");
        setS3AccessKey(data.s3AccessKey || "");
        setS3SecretKey(data.s3SecretKey || "");
        setMaxFileSizeMB(data.MAX_FILE_SIZE_MB || "10");
        setAllowedFileTypes(data.ALLOWED_FILE_TYPES || "pdf, jpg, png, jpeg, docx, xlsx");
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
          uploadDir,
          s3Enabled: s3Enabled.toString(),
          s3Endpoint,
          s3Bucket,
          s3Region,
          s3AccessKey,
          s3SecretKey,
          settings: { 
            MAX_FILE_SIZE_MB: maxFileSizeMB,
            ALLOWED_FILE_TYPES: allowedFileTypes
          }
        }),
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

        <hr className="border-slate-200 dark:border-slate-700 my-6" />

        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">ขนาดไฟล์อัปโหลด</h3>
          <p className="text-sm text-slate-500 dark:text-white mb-4">
            จำกัดขนาดไฟล์สูงสุดที่อนุญาตให้อัปโหลดเข้าสู่ระบบ
          </p>
          
          <label className="block text-sm font-medium text-slate-700 dark:text-white mb-2">
            ขนาดไฟล์สูงสุด (MB)
          </label>
          <div className="flex gap-3">
            <input
              type="number"
              min="1"
              max="2000"
              value={maxFileSizeMB}
              onChange={(e) => setMaxFileSizeMB(e.target.value)}
              className="flex-1 max-w-[200px] rounded-lg border-slate-200 dark:border-slate-600 border p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </div>

        <hr className="border-slate-200 dark:border-slate-700 my-6" />

        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">ประเภทไฟล์ที่อนุญาต</h3>
          <p className="text-sm text-slate-500 dark:text-white mb-4">
            กำหนดนามสกุลไฟล์ที่อนุญาตให้อัปโหลดเข้าสู่ระบบ (คั่นด้วยลูกน้ำ ,)
          </p>
          
          <label className="block text-sm font-medium text-slate-700 dark:text-white mb-2">
            นามสกุลไฟล์ (เช่น pdf, jpg, png, docx)
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={allowedFileTypes}
              onChange={(e) => setAllowedFileTypes(e.target.value)}
              className="flex-1 max-w-[400px] rounded-lg border-slate-200 dark:border-slate-600 border p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="pdf, jpg, png, docx, xlsx"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </div>



        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">ระบบสำรองข้อมูลอัตโนมัติ (Cloud Backup)</h3>
          <p className="text-sm text-slate-500 mb-4">
            บันทึกไฟล์ขึ้นระบบ Cloud Storage (เช่น AWS S3 หรือ MinIO) โดยอัตโนมัติ เพื่อป้องกันข้อมูลสูญหายจากฮาร์ดแวร์พัง
          </p>
          
          <div className="space-y-4">
            <label className="flex items-center gap-2 mb-4">
              <input type="checkbox" checked={s3Enabled} onChange={e => setS3Enabled(e.target.checked)} className="rounded text-blue-600" />
              <span className="font-medium text-slate-700 dark:text-white">เปิดใช้งานการสำรองข้อมูลขึ้น Cloud</span>
            </label>

            {s3Enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Endpoint (เว้นว่างหากใช้ AWS S3 มาตรฐาน)</label>
                  <input type="text" value={s3Endpoint} onChange={e => setS3Endpoint(e.target.value)} placeholder="https://play.min.io" className="w-full p-2 text-sm border rounded bg-white dark:bg-slate-900 dark:border-slate-600 outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Bucket Name</label>
                  <input type="text" value={s3Bucket} onChange={e => setS3Bucket(e.target.value)} placeholder="dms-backups" className="w-full p-2 text-sm border rounded bg-white dark:bg-slate-900 dark:border-slate-600 outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Region</label>
                  <input type="text" value={s3Region} onChange={e => setS3Region(e.target.value)} placeholder="ap-southeast-1" className="w-full p-2 text-sm border rounded bg-white dark:bg-slate-900 dark:border-slate-600 outline-none focus:border-blue-500" />
                </div>
                <div></div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Access Key</label>
                  <input type="text" value={s3AccessKey} onChange={e => setS3AccessKey(e.target.value)} className="w-full p-2 text-sm border rounded bg-white dark:bg-slate-900 dark:border-slate-600 outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Secret Key</label>
                  <input type="password" value={s3SecretKey} onChange={e => setS3SecretKey(e.target.value)} className="w-full p-2 text-sm border rounded bg-white dark:bg-slate-900 dark:border-slate-600 outline-none focus:border-blue-500" />
                </div>
              </div>
            )}
            
            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่าระบบจัดเก็บข้อมูล"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

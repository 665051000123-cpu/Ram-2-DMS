"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Save, Shield } from "lucide-react";
import { AllPermissions, DEFAULT_PERMISSIONS, RolePermissions } from "@/lib/permissions";

export default function RolePermissionSettings() {
  const [permissions, setPermissions] = useState<AllPermissions>(DEFAULT_PERMISSIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const res = await fetch("/api/settings/permissions");
      if (res.ok) {
        const data = await res.json();
        setPermissions(data);
      }
    } catch (error) {
      console.error("Failed to fetch permissions", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (role: "DEPT_HEAD" | "STAFF", key: keyof RolePermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [key]: !prev[role][key],
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(permissions),
      });

      if (!res.ok) throw new Error("Failed to save permissions");

      toast.success("บันทึกสิทธิ์การใช้งานเรียบร้อยแล้ว");
    } catch (error: any) {
      toast.error(error.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-sm animate-pulse h-64 border border-slate-100 dark:border-slate-800"></div>;
  }

  const permissionItems = [
    { key: "menu_trash" as const, label: "มองเห็นเมนูถังขยะ" },
    { key: "menu_audit" as const, label: "มองเห็นเมนูประวัติการใช้งาน" },
    { key: "menu_users" as const, label: "มองเห็นเมนูจัดการผู้ใช้งาน" },
    { key: "doc_edit" as const, label: "สิทธิ์การแก้ไขข้อมูลเอกสาร" },
    { key: "doc_delete" as const, label: "สิทธิ์การลบ/นำเอกสารลงถังขยะ" },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 transition-colors border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Shield className="text-indigo-500" /> สิทธิ์การใช้งาน (Role Permissions)
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            เปิด-ปิด การมองเห็นเมนูและการกระทำต่างๆ ของแต่ละระดับผู้ใช้งาน
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
        >
          <Save size={18} />
          {isSaving ? "กำลังบันทึก..." : "บันทึกสิทธิ์"}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">ฟังก์ชัน / เมนู</th>
              <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300 text-center">หัวหน้าแผนก (Dept. Head)</th>
              <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300 text-center">เจ้าหน้าที่ (Staff)</th>
            </tr>
          </thead>
          <tbody>
            {permissionItems.map((item) => (
              <tr key={item.key} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                <td className="py-4 px-4 text-slate-700 dark:text-slate-300">{item.label}</td>
                <td className="py-4 px-4 text-center">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={permissions.DEPT_HEAD[item.key]}
                      onChange={() => handleToggle("DEPT_HEAD", item.key)}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                  </label>
                </td>
                <td className="py-4 px-4 text-center">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={permissions.STAFF[item.key]}
                      onChange={() => handleToggle("STAFF", item.key)}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800/30 text-sm text-yellow-800 dark:text-yellow-300">
          <strong>หมายเหตุ:</strong> Super Admin มีสิทธิ์ในการเข้าถึงและแก้ไขทุกฟังก์ชันโดยค่าเริ่มต้น
        </div>
      </div>
    </div>
  );
}

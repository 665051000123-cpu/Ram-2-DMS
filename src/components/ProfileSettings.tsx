"use client";

import { useState } from "react";
import { User, Lock, Key } from "lucide-react";
import toast from "react-hot-toast";

export default function ProfileSettings({ user }: { user: any }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/users/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to change password");
      }

      toast.success("เปลี่ยนรหัสผ่านสำเร็จ");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Basic Info (Read only) */}
      <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-600 flex items-center gap-3">
          <User className="text-blue-500 dark:text-blue-300" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            ข้อมูลผู้ใช้งาน
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-500 dark:text-white mb-1">
                ชื่อ-นามสกุล
              </label>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white font-medium">
                {user.name}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 dark:text-white mb-1">
                รหัสพนักงาน (H.N.)
              </label>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white font-medium">
                {user.email}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 dark:text-white mb-1">
                ตำแหน่ง / สิทธิ์
              </label>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white font-medium">
                {user.role}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 dark:text-white mb-1">
                แผนก
              </label>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white font-medium">
                {user.departmentName || "-"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Change Password */}
      <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-600 flex items-center gap-3">
          <Lock className="text-amber-500" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            เปลี่ยนรหัสผ่าน
          </h2>
        </div>
        <form
          onSubmit={handleChangePassword}
          className="p-6 space-y-4 max-w-md"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1">
              รหัสผ่านปัจจุบัน
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full p-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1">
              รหัสผ่านใหม่
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1">
              ยืนยันรหัสผ่านใหม่
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium disabled:opacity-50"
            >
              <Key size={18} />
              {loading ? "กำลังเปลี่ยนรหัสผ่าน..." : "เปลี่ยนรหัสผ่าน"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { KeyRound, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";

export default function ForcePasswordChange() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/users/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to change password");
      }

      toast.success(
        "เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่ด้วยรหัสผ่านใหม่",
      );

      // Force sign out to refresh session and force login with new password
      setTimeout(() => {
        signOut({ callbackUrl: "/login" });
      }, 2000);
    } catch (error: any) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-[9999] p-4 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-900 transition-colors rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ShieldAlert size={120} />
          </div>
          <div className="w-20 h-20 bg-white/20 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
            <KeyRound size={40} className="text-white drop-shadow-md" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 relative z-10">
            เปลี่ยนรหัสผ่าน
          </h2>
          <p className="text-indigo-100 text-sm relative z-10">
            เพื่อความปลอดภัยของข้อมูล
            กรุณาตั้งรหัสผ่านใหม่สำหรับการเข้าใช้งานครั้งแรก
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-8 space-y-5 bg-white dark:bg-slate-900 transition-colors"
        >
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-white mb-1.5">
              รหัสผ่านใหม่
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all focus:bg-white dark:bg-slate-900 transition-colors"
              placeholder="อย่างน้อย 6 ตัวอักษร"
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-white mb-1.5">
              ยืนยันรหัสผ่านใหม่
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all focus:bg-white dark:bg-slate-900 transition-colors"
              placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
              minLength={6}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-indigo-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "กำลังบันทึก..." : "บันทึกและเข้าสู่ระบบใหม่"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

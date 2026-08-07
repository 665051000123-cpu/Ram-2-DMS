"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { UserCircle, Shield, Key, Bell } from "lucide-react";

export default function ProfilePage() {
  const { data: session } = useSession();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);

  const [notifyOnUpload, setNotifyOnUpload] = useState(true);
  const [notifyOnShare, setNotifyOnShare] = useState(true);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/users/settings")
        .then((res) => res.json())
        .then((data) => {
          if (data && !data.error) {
            setNotifyOnUpload(data.notifyOnUpload);
            setNotifyOnShare(data.notifyOnShare);
          }
        })
        .catch(console.error);
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/users/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session?.user?.id,
          oldPassword,
          newPassword,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
      }

      toast.success("เปลี่ยนรหัสผ่านสำเร็จ");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch("/api/users/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifyOnUpload, notifyOnShare }),
      });
      if (!res.ok) throw new Error("บันทึกการตั้งค่าไม่สำเร็จ");
      toast.success("บันทึกการตั้งค่าแจ้งเตือนแล้ว");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSettingsLoading(false);
    }
  };

  if (!session?.user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          โปรไฟล์ส่วนตัว
        </h1>
        <p className="text-slate-500 dark:text-white mt-1">
          จัดการข้อมูลบัญชีผู้ใช้และรหัสผ่านของคุณ
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ข้อมูลบัญชี */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 p-6 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center mb-4">
              <UserCircle size={48} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
              {session.user.name}
            </h2>
            <p className="text-slate-500 dark:text-white mt-1">
              {session.user.email}
            </p>

            <div className="w-full mt-6 pt-6 border-t border-slate-100 dark:border-slate-600 space-y-3 text-left">
              <div>
                <p className="text-xs text-slate-400 dark:text-white uppercase tracking-wider font-semibold">
                  แผนก
                </p>
                <p className="text-slate-800 dark:text-white font-medium">
                  {session.user.departmentName || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 dark:text-white uppercase tracking-wider font-semibold">
                  สิทธิ์การใช้งาน
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Shield
                    size={14}
                    className="text-blue-500 dark:text-blue-300"
                  />
                  <span className="text-slate-800 dark:text-white font-medium">
                    {session.user.role === "SUPER_ADMIN"
                      ? "Super Admin"
                      : session.user.role === "DEPARTMENT_HEAD"
                        ? "หัวหน้าแผนก"
                        : "เจ้าหน้าที่"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* เปลี่ยนรหัสผ่าน */}
        <div className="md:col-span-2">
          <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 flex items-center gap-2">
              <Key className="text-slate-400 dark:text-white" />
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                เปลี่ยนรหัสผ่าน
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1">
                  รหัสผ่านปัจจุบัน
                </label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1">
                  รหัสผ่านใหม่
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="••••••••"
                />
                <p className="text-xs text-slate-500 dark:text-white mt-1">
                  รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1">
                  ยืนยันรหัสผ่านใหม่
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-600 flex justify-end">
                <button
                  type="submit"
                  disabled={
                    loading || !oldPassword || !newPassword || !confirmPassword
                  }
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
                </button>
              </div>
            </form>
          </div>

          {/* การตั้งค่าการแจ้งเตือน */}
          <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden mt-6">
            <div className="p-6 border-b border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 flex items-center gap-2">
              <Bell className="text-slate-400 dark:text-white" />
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                การตั้งค่าการแจ้งเตือน
              </h2>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800 dark:text-white">
                    แจ้งเตือนเอกสารใหม่ในแผนก
                  </p>
                  <p className="text-sm text-slate-500 dark:text-white">
                    รับการแจ้งเตือนเมื่อมีคนอัปโหลดหรือแก้ไขเอกสารในแผนกของคุณ
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={notifyOnUpload}
                    onChange={(e) => setNotifyOnUpload(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 transition-colors peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-900 transition-colors after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800 dark:text-white">
                    แจ้งเตือนเมื่อมีการแชร์เอกสาร
                  </p>
                  <p className="text-sm text-slate-500 dark:text-white">
                    รับการแจ้งเตือนเมื่อมีคนให้สิทธิ์การเข้าถึงเอกสารส่วนตัวกับคุณ
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={notifyOnShare}
                    onChange={(e) => setNotifyOnShare(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 transition-colors peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-900 transition-colors after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-600 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={settingsLoading}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium shadow-sm disabled:opacity-50"
                >
                  {settingsLoading ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

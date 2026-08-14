"use client";
import { AlertTriangle, X, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
type ConfirmModalProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  requirePassword?: boolean;
};

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "ยืนยัน",
  cancelText = "ยกเลิก",
  onConfirm,
  onCancel,
  requirePassword = false,
}: ConfirmModalProps) {
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Reset password when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setVerifying(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirmClick = async () => {
    if (!requirePassword) {
      onConfirm();
      return;
    }

    if (!password) {
      toast.error("กรุณากรอกรหัสผ่านเพื่อยืนยัน");
      return;
    }

    setVerifying(true);
    try {
      const res = await fetch("/api/auth/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "รหัสผ่านไม่ถูกต้อง");
      }

      // Password is correct
      onConfirm();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle
                className="text-red-600 dark:text-red-300"
                size={24}
              />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                {title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-white leading-relaxed">
                {message}
              </p>
            </div>
          </div>

          {requirePassword && (
            <div className="mt-5">
              <label className="block text-sm font-medium text-slate-700 dark:text-white mb-2">
                ยืนยันรหัสผ่านเพื่อดำเนินการ
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400 dark:text-slate-300" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="รหัสผ่านของคุณ"
                  className="block w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmClick();
                  }}
                  disabled={verifying}
                  autoFocus
                  autoComplete="new-password"
                  data-lpignore="true"
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-600 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={verifying}
            className="px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-white bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors hover:text-slate-900 dark:text-white disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirmClick}
            disabled={verifying}
            className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-sm shadow-red-200 disabled:opacity-50 flex items-center gap-2"
          >
            {verifying ? "กำลังตรวจสอบ..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

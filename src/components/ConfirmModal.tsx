import { AlertTriangle, X } from "lucide-react";

type ConfirmModalProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "ยืนยัน",
  cancelText = "ยกเลิก",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

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
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-600 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-white bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors hover:text-slate-900 dark:text-white"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-sm shadow-red-200"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

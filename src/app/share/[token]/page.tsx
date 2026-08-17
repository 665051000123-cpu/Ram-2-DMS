"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { FileText, Lock, Download, AlertCircle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function PublicSharePage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docInfo, setDocInfo] = useState<any>(null);
  const [password, setPassword] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchInfo();
  }, [token]);

  const fetchInfo = async () => {
    try {
      const res = await fetch(`/api/share/${token}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load document");
        return;
      }
      setDocInfo(data);
    } catch (err) {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (docInfo.hasPassword && !password) {
      toast.error("กรุณากรอกรหัสผ่าน");
      return;
    }

    setDownloading(true);
    try {
      const res = await fetch(`/api/share/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to download");
        setDownloading(false);
        return;
      }

      // Trigger download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Extract filename from disposition if possible, else fallback
      const disposition = res.headers.get("content-disposition");
      let filename = docInfo.title || "document";
      if (disposition && disposition.indexOf('filename*=UTF-8\'\'') !== -1) {
        filename = decodeURIComponent(disposition.split('filename*=UTF-8\'\'')[1]);
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("ดาวน์โหลดสำเร็จ");
    } catch (err) {
      toast.error("เกิดข้อผิดพลาดในการดาวน์โหลด");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">เข้าถึงไม่ได้</h1>
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 line-clamp-2">{docInfo.title}</h1>
            <p className="text-sm text-slate-500">
              ขนาด: {(docInfo.fileSize / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>

        <form onSubmit={handleDownload} className="space-y-4">
          {docInfo.hasPassword && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                รหัสผ่าน (Password)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="กรอกรหัสผ่านเพื่อดาวน์โหลด"
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={downloading || (docInfo.hasPassword && !password)}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            {downloading ? "กำลังดาวน์โหลด..." : "ดาวน์โหลดเอกสาร"}
          </button>
        </form>
      </div>
    </div>
  );
}

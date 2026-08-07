"use client";

import { useState } from "react";
import {
  Search,
  Activity,
  UploadCloud,
  Download,
  Trash2,
  Eye,
  Edit,
  FileSpreadsheet,
} from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

type AuditLog = {
  id: string;
  action: string;
  details: string | null;
  createdAt: Date;
  user?: {
    name: string;
    role: string;
  } | null;
  document?: {
    title: string;
    department?: {
      name: string;
    } | null;
  } | null;
};

export default function AuditLogList({
  initialLogs,
  currentUserRole,
}: {
  initialLogs: AuditLog[];
  currentUserRole: string;
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredLogs = initialLogs.filter((log) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      log.user?.name.toLowerCase().includes(searchLower) ||
      log.document?.title.toLowerCase().includes(searchLower) ||
      log.action.toLowerCase().includes(searchLower)
    );
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case "UPLOAD":
        return <UploadCloud size={16} className="text-emerald-500" />;
      case "DOWNLOAD":
        return (
          <Download size={16} className="text-blue-500 dark:text-blue-300" />
        );
      case "VIEW":
        return <Eye size={16} className="text-purple-500" />;
      case "EDIT":
        return <Edit size={16} className="text-orange-500" />;
      case "DELETE":
        return <Trash2 size={16} className="text-red-500" />;
      default:
        return (
          <Activity size={16} className="text-slate-500 dark:text-white" />
        );
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "UPLOAD":
        return (
          <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 rounded-full text-xs font-medium border border-emerald-100">
            อัปโหลด
          </span>
        );
      case "DOWNLOAD":
        return (
          <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 rounded-full text-xs font-medium border border-blue-100">
            ดาวน์โหลด/เปิดดู
          </span>
        );
      case "EDIT":
        return (
          <span className="px-2.5 py-1 bg-orange-50 text-orange-600 rounded-full text-xs font-medium border border-orange-100">
            แก้ไขข้อมูล
          </span>
        );
      case "DELETE":
        return (
          <span className="px-2.5 py-1 bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-300 rounded-full text-xs font-medium border border-red-100">
            ลบเอกสาร
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-white rounded-full text-xs font-medium border border-slate-200 dark:border-slate-600">
            {action}
          </span>
        );
    }
  };

  const handleExportExcel = () => {
    if (filteredLogs.length === 0) return;

    // Prepare data for Excel
    const dataToExport = filteredLogs.map((log) => ({
      วันที่และเวลา: format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss"),
      ผู้ทำรายการ: log.user?.name || "Unknown",
      ตำแหน่ง: log.user?.role || "Unknown",
      "การกระทำ (Action)": log.action,
      ชื่อเอกสาร: log.document?.title || "ไม่พบเอกสาร",
      "แผนก (ของเอกสาร)": log.document?.department?.name || "-",
    }));

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);

    // Adjust column widths
    const wscols = [
      { wch: 20 }, // Date
      { wch: 25 }, // User
      { wch: 15 }, // Role
      { wch: 15 }, // Action
      { wch: 40 }, // Document
      { wch: 20 }, // Department
    ];
    worksheet["!cols"] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Logs");

    // Generate file and trigger download
    const fileName = `AuditLogs_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
      {/* Header & Search */}
      <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-600 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800">
        <div className="relative w-full md:w-96 flex-shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400 dark:text-white" />
          </div>
          <input
            type="text"
            placeholder="ค้นหาชื่อผู้ใช้, ชื่อเอกสาร, หรือ Action..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
          />
        </div>

        {currentUserRole === "SUPER_ADMIN" && (
          <button
            onClick={handleExportExcel}
            disabled={filteredLogs.length === 0}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-100 dark:bg-emerald-500/20 font-semibold rounded-xl transition whitespace-nowrap w-full md:w-auto disabled:opacity-50"
          >
            <FileSpreadsheet size={20} />
            Export to Excel
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-white text-sm border-b border-slate-200 dark:border-slate-600">
              <th className="font-semibold py-4 px-6 w-1/4">วันที่และเวลา</th>
              <th className="font-semibold py-4 px-6">ผู้ทำรายการ</th>
              <th className="font-semibold py-4 px-6">การกระทำ (Action)</th>
              <th className="font-semibold py-4 px-6 w-1/3">ชื่อเอกสาร</th>
              {currentUserRole === "SUPER_ADMIN" && (
                <th className="font-semibold py-4 px-6">แผนก (ของเอกสาร)</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <td className="py-4 px-6 text-sm text-slate-600 dark:text-white">
                    {format(new Date(log.createdAt), "dd MMM yyyy, HH:mm:ss")}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-800 dark:text-white">
                        {log.user?.name || "Unknown User"}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-white">
                        {log.user?.role || "Unknown"}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      {getActionIcon(log.action)}
                      {getActionBadge(log.action)}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-medium text-slate-700 dark:text-white line-clamp-2">
                      {log.document?.title || (
                        <span className="text-slate-400 dark:text-white italic">
                          ไม่พบเอกสาร (อาจถูกลบไปแล้ว)
                        </span>
                      )}
                    </span>
                  </td>
                  {currentUserRole === "SUPER_ADMIN" && (
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-white">
                      {log.document?.department?.name || "-"}
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={currentUserRole === "SUPER_ADMIN" ? 5 : 4}
                  className="py-16 text-center"
                >
                  <div className="inline-flex flex-col items-center justify-center text-slate-400 dark:text-white">
                    <Activity size={48} className="mb-4 opacity-20" />
                    <p className="text-lg font-medium">ไม่พบประวัติการใช้งาน</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { Building2, Plus, Trash2, Users, FileText, Search } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import ConfirmModal from "./ConfirmModal";

type Department = {
  id: string;
  name: string;
  createdAt: Date;
  _count: {
    users: number;
    documents: number;
  };
};

export default function DepartmentSettings({
  initialDepartments,
}: {
  initialDepartments: Department[];
}) {
  const router = useRouter();
  const [departments, setDepartments] =
    useState<Department[]>(initialDepartments);
  const [isAdding, setIsAdding] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    deptId: string;
    deptName: string;
  }>({
    isOpen: false,
    deptId: "",
    deptName: "",
  });

  const filteredDepartments = useMemo(() => {
    return departments.filter((dept) =>
      dept.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [departments, searchTerm]);

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    setLoading(true);

    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDeptName.trim() }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create department");
      }

      const { department } = await res.json();

      // Add the count placeholder for new department
      const deptWithCount = {
        ...department,
        _count: { users: 0, documents: 0 },
      };

      setDepartments([deptWithCount, ...departments]);
      setNewDeptName("");
      setIsAdding(false);
      toast.success("เพิ่มแผนกสำเร็จ");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (deptId: string, deptName: string) => {
    setConfirmModal({ isOpen: true, deptId, deptName });
  };

  const handleConfirmDelete = async () => {
    const { deptId } = confirmModal;
    setConfirmModal({ isOpen: false, deptId: "", deptName: "" });

    try {
      const res = await fetch(`/api/departments/${deptId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete department");
      }

      setDepartments(departments.filter((d) => d.id !== deptId));
      toast.success("ลบแผนกสำเร็จ");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-600 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
        <div className="flex items-center gap-2">
          <Building2 className="text-slate-400 dark:text-white" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            จัดการรายชื่อแผนก
          </h2>
        </div>
        <div className="flex gap-3">
          {/* Search Box */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400 dark:text-white" />
            </div>
            <input
              type="text"
              placeholder="ค้นหาแผนก..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full md:w-64 pl-9 pr-4 py-2 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm"
            />
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-sm font-medium shrink-0"
          >
            <Plus size={18} />
            เพิ่มแผนก
          </button>
        </div>
      </div>

      {/* Add Form */}
      {isAdding && (
        <div className="p-6 border-b border-slate-200 dark:border-slate-600 bg-blue-50 dark:bg-blue-500/20">
          <form onSubmit={handleAddDepartment} className="flex gap-4 max-w-lg">
            <input
              type="text"
              required
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              placeholder="ชื่อแผนก เช่น งานเอกซเรย์"
              className="flex-1 p-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium disabled:opacity-50"
            >
              {loading ? "กำลังบันทึก..." : "บันทึก"}
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2.5 text-slate-500 dark:text-white hover:text-slate-700 dark:text-white font-medium"
            >
              ยกเลิก
            </button>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white dark:bg-slate-900 transition-colors text-slate-500 dark:text-white text-sm border-b border-slate-200 dark:border-slate-600">
              <th className="font-semibold py-4 px-6">ชื่อแผนก</th>
              <th className="font-semibold py-4 px-6 text-center">
                จำนวนผู้ใช้งาน
              </th>
              <th className="font-semibold py-4 px-6 text-center">
                จำนวนเอกสาร
              </th>
              <th className="font-semibold py-4 px-6">วันที่เพิ่ม</th>
              <th className="font-semibold py-4 px-6 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredDepartments.length > 0 ? (
              filteredDepartments.map((dept) => (
                <tr
                  key={dept.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <td className="py-4 px-6 font-medium text-slate-800 dark:text-white">
                    {dept.name}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-white rounded-full text-sm font-medium">
                      <Users size={14} />
                      {dept._count.users}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 rounded-full text-sm font-medium">
                      <FileText size={14} />
                      {dept._count.documents}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-slate-500 dark:text-white text-sm">
                    {format(new Date(dept.createdAt), "dd MMM yyyy")}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => handleDeleteClick(dept.id, dept.name)}
                        disabled={
                          dept._count.users > 0 || dept._count.documents > 0
                        }
                        className="p-2 text-red-500 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-lg transition disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        title={
                          dept._count.users > 0 || dept._count.documents > 0
                            ? "ไม่สามารถลบแผนกที่มีข้อมูลอยู่ได้"
                            : "ลบแผนก"
                        }
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-12 text-center">
                  <div className="inline-flex flex-col items-center justify-center text-slate-400 dark:text-white">
                    <Search size={40} className="mb-3 opacity-20" />
                    <p className="text-base font-medium text-slate-500 dark:text-white">
                      {departments.length === 0
                        ? "ยังไม่มีข้อมูลแผนกในระบบ"
                        : "ไม่พบแผนกที่ค้นหา"}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="ยืนยันการลบแผนก"
        message={`คุณแน่ใจหรือไม่ว่าต้องการลบแผนก "${confirmModal.deptName}"? (จะไม่สามารถลบได้หากยังมีผู้ใช้งานหรือเอกสารที่เชื่อมโยงอยู่)`}
        onConfirm={handleConfirmDelete}
        onCancel={() =>
          setConfirmModal({ isOpen: false, deptId: "", deptName: "" })
        }
      />
    </div>
  );
}

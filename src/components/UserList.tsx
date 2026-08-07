"use client";

import { useState, useMemo } from "react";
import {
  UserPlus,
  Trash2,
  Mail,
  Shield,
  User as UserIcon,
  Search,
  Filter,
  Power,
} from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import ConfirmModal from "./ConfirmModal";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  department?: {
    id: string;
    name: string;
  };
};

export default function UserList({
  initialUsers,
  currentUserRole,
  currentUserId,
  departments,
  currentUserDepartmentId,
}: {
  initialUsers: User[];
  currentUserRole: string;
  currentUserId: string;
  departments: { id: string; name: string }[];
  currentUserDepartmentId: string | null;
}) {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [showAddModal, setShowAddModal] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");
  const [filterDepartment, setFilterDepartment] = useState("ALL");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("STAFF");
  const [departmentId, setDepartmentId] = useState(
    currentUserDepartmentId || "",
  );
  const [loading, setLoading] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
  }>({
    isOpen: false,
    userId: "",
    userName: "",
  });

  const openAddModal = () => {
    setEditingUserId(null);
    setName("");
    setEmail("");
    setPassword("");
    setRole("STAFF");
    setDepartmentId(currentUserDepartmentId || "");
    setShowAddModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUserId(user.id);
    setName(user.name);
    setEmail(user.email);
    setPassword("");
    setRole(user.role);
    setDepartmentId(user.department?.id || currentUserDepartmentId || "");
    setShowAddModal(true);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentId) {
      toast.error("กรุณาเลือกแผนก");
      return;
    }
    setLoading(true);

    try {
      if (editingUserId) {
        // Edit User
        const res = await fetch(`/api/users/${editingUserId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, role, departmentId, password }),
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to update user");
        }
        const { user } = await res.json();
        setUsers(users.map((u) => (u.id === editingUserId ? user : u)));
        toast.success("แก้ไขข้อมูลผู้ใช้งานสำเร็จ");
      } else {
        // Add User
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            password: "hospital123", // Default Password
            role,
            departmentId,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to create user");
        }

        const { user } = await res.json();
        setUsers([user, ...users]);
        toast.success("เพิ่มผู้ใช้งานสำเร็จ! รหัสผ่านเริ่มต้นคือ: hospital123");
      }

      setShowAddModal(false);
      setName("");
      setEmail("");
      setPassword("");
      setRole("STAFF");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSuspend = async (userId: string, currentIsActive: boolean) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentIsActive, name: users.find(u => u.id === userId)?.name, email: users.find(u => u.id === userId)?.email, role: users.find(u => u.id === userId)?.role }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      
      const { user } = await res.json();
      setUsers(users.map((u) => (u.id === userId ? { ...u, isActive: user.isActive } : u)));
      toast.success(currentIsActive ? "ระงับการใช้งานสำเร็จ" : "เปิดใช้งานสำเร็จ");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    setConfirmModal({ isOpen: true, userId: id, userName: name });
  };

  const handleConfirmDelete = async () => {
    const { userId: id } = confirmModal;
    setConfirmModal({ isOpen: false, userId: "", userName: "" });

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Delete failed");

      setUsers(users.filter((u) => u.id !== id));
      toast.success("ลบผู้ใช้งานสำเร็จ");
      router.refresh();
    } catch (error) {
      toast.error("ไม่สามารถลบผู้ใช้งานได้");
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return (
          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-md text-xs font-semibold">
            Super Admin
          </span>
        );
      case "DEPT_HEAD":
        return (
          <span className="px-2 py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-md text-xs font-semibold">
            หัวหน้าแผนก
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-white rounded-md text-xs font-medium">
            เจ้าหน้าที่ (Staff)
          </span>
        );
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Text search (name or email/HN)
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());

      // Role filter
      const matchesRole = filterRole === "ALL" || user.role === filterRole;

      // Department filter
      const matchesDept =
        filterDepartment === "ALL" || user.department?.id === filterDepartment;

      return matchesSearch && matchesRole && matchesDept;
    });
  }, [users, searchTerm, filterRole, filterDepartment]);

  return (
    <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
      {/* Header & Actions */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-600 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
        <div className="flex items-center gap-2">
          <UserIcon className="text-slate-400 dark:text-white" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            รายชื่อบุคลากร
          </h2>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-sm font-medium shrink-0"
        >
          <UserPlus size={18} />
          เพิ่มบุคลากร
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 transition-colors flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400 dark:text-white" />
          </div>
          <input
            type="text"
            placeholder="ค้นหาชื่อ หรือ รหัสพนักงาน (H.N.)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:bg-white dark:bg-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm"
          />
        </div>

        {/* Role Filter */}
        <div className="md:w-48 relative">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:bg-white dark:bg-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm appearance-none"
          >
            <option value="ALL">ตำแหน่งทั้งหมด</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="DEPT_HEAD">หัวหน้าแผนก</option>
            <option value="STAFF">เจ้าหน้าที่</option>
          </select>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Filter className="h-4 w-4 text-slate-400 dark:text-white" />
          </div>
        </div>

        {/* Department Filter (Only for SUPER_ADMIN) */}
        {currentUserRole === "SUPER_ADMIN" && (
          <div className="md:w-48 relative">
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:bg-white dark:bg-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm appearance-none"
            >
              <option value="ALL">แผนกทั้งหมด</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-slate-400 dark:text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white dark:bg-slate-900 transition-colors text-slate-500 dark:text-white text-sm border-b border-slate-200 dark:border-slate-600">
              <th className="font-semibold py-4 px-6">ชื่อ - นามสกุล</th>
              <th className="font-semibold py-4 px-6">แผนก</th>
              <th className="font-semibold py-4 px-6">รหัสพนักงาน (H.N.)</th>
              <th className="font-semibold py-4 px-6">ตำแหน่ง / สิทธิ์</th>
              <th className="font-semibold py-4 px-6 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <td className="py-4 px-6 font-medium text-slate-800 dark:text-white">
                    {user.name}{" "}
                    {user.id === currentUserId && (
                      <span className="text-xs text-blue-500 dark:text-blue-300 font-normal ml-2">
                        (คุณ)
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-slate-600 dark:text-white">
                    {user.department?.name || "-"}
                  </td>
                  <td className="py-4 px-6 text-slate-600 dark:text-white flex items-center gap-2">
                    <Mail
                      size={14}
                      className="text-slate-400 dark:text-white"
                    />{" "}
                    {user.email}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col gap-1 items-start">
                      {getRoleBadge(user.role)}
                      {!user.isActive && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300">
                          ระงับการใช้งาน
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center gap-2">
                      {user.id !== currentUserId && (
                        <>
                          <button
                            onClick={() => handleToggleSuspend(user.id, user.isActive)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                              user.isActive ? "bg-green-500" : "bg-red-500"
                            }`}
                            title={user.isActive ? "ระงับการใช้งาน" : "เปิดใช้งาน"}
                          >
                            <span className="sr-only">Toggle suspend</span>
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                user.isActive ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-2 text-slate-400 dark:text-white hover:text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-lg transition"
                            title="แก้ไขข้อมูล"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                            </svg>
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteClick(user.id, user.name)
                            }
                            className="p-2 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-lg transition"
                            title="ลบผู้ใช้งาน"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
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
                      ไม่พบผู้ใช้งาน
                    </p>
                    <p className="text-sm mt-1">
                      ลองเปลี่ยนคำค้นหา หรือตัวกรองใหม่
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-600">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                {editingUserId ? "แก้ไขข้อมูลผู้ใช้งาน" : "เพิ่มผู้ใช้งานใหม่"}
              </h3>
              {!editingUserId && (
                <p className="text-sm text-slate-500 dark:text-white mt-1">
                  รหัสผ่านเริ่มต้นของพนักงานใหม่คือ <b>hospital123</b>
                </p>
              )}
            </div>
            <form
              onSubmit={handleAddUser}
              className="p-6 space-y-4 bg-slate-50 dark:bg-slate-800"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1">
                  ชื่อ - นามสกุล
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="เช่น สมชาย ใจดี"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1">
                  รหัสพนักงาน (H.N.)
                </label>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="XXXXXX"
                  minLength={6}
                  maxLength={6}
                />
              </div>
              {editingUserId && currentUserRole === "SUPER_ADMIN" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1">
                    รหัสผ่านใหม่ (ไม่บังคับ)
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="ปล่อยว่างหากไม่ต้องการเปลี่ยนรหัสผ่าน"
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-slate-500 dark:text-white mt-1">
                    หากคุณเปลี่ยนรหัสผ่าน
                    ผู้ใช้จะถูกบังคับให้ตั้งรหัสใหม่เมื่อเข้าใช้งานครั้งถัดไป
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1">
                  สิทธิ์การใช้งาน (Role)
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="STAFF">เจ้าหน้าที่ (Staff)</option>
                  <option value="DEPT_HEAD">
                    หัวหน้าแผนก (Department Head)
                  </option>
                </select>
              </div>

              {/* Department Dropdown (Only for SUPER_ADMIN or if multiple departments) */}
              {currentUserRole === "SUPER_ADMIN" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1">
                    สังกัดแผนก
                  </label>
                  <select
                    required
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="" disabled>
                      -- เลือกแผนก --
                    </option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 text-slate-600 dark:text-white bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors transition-all duration-200 font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition font-medium disabled:opacity-50"
                >
                  {loading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="ยืนยันการลบผู้ใช้งาน"
        message={`คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้งาน "${confirmModal.userName}" ออกจากระบบ? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        onConfirm={handleConfirmDelete}
        onCancel={() =>
          setConfirmModal({ isOpen: false, userId: "", userName: "" })
        }
      />
    </div>
  );
}

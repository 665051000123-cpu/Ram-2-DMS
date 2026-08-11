import { useState, useEffect } from "react";
import { X, Shield, Plus, Trash2, Building2, User as UserIcon, BadgeCheck } from "lucide-react";
import toast from "react-hot-toast";

interface FolderAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderId: string;
  folderName: string;
}

const ROLES = [
  { id: "SUPER_ADMIN", name: "Super Admin" },
  { id: "DEPT_HEAD", name: "หัวหน้าแผนก (Department Head)" },
  { id: "STAFF", name: "พนักงาน (Staff)" }
];

export default function FolderAccessModal({
  isOpen,
  onClose,
  folderId,
  folderName,
}: FolderAccessModalProps) {
  const [activeTab, setActiveTab] = useState<"DEPARTMENT" | "USER" | "ROLE">("DEPARTMENT");
  
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [accessList, setAccessList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("");

  useEffect(() => {
    if (isOpen && folderId) {
      fetchData();
    }
  }, [isOpen, folderId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [deptRes, userRes, accessRes] = await Promise.all([
        fetch("/api/departments"),
        fetch("/api/users"),
        fetch(`/api/folders/${folderId}/access`),
      ]);
      const deptData = await deptRes.json();
      const userData = await userRes.json();
      const accessData = await accessRes.json();

      setDepartments(Array.isArray(deptData) ? deptData : []);
      setUsers(Array.isArray(userData.users) ? userData.users : []);
      setAccessList(accessData.accesses || []);
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลสิทธิ์");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAccess = () => {
    if (activeTab === "DEPARTMENT") {
      if (!selectedDeptId) return;
      if (accessList.some(a => a.departmentId === selectedDeptId)) {
        toast.error("แผนกนี้มีสิทธิ์อยู่แล้ว");
        return;
      }
      const dept = departments.find(d => d.id === selectedDeptId);
      if (!dept) return;
      setAccessList([...accessList, { departmentId: selectedDeptId, department: dept }]);
      setSelectedDeptId("");
    } else if (activeTab === "USER") {
      if (!selectedUserId) return;
      if (accessList.some(a => a.userId === selectedUserId)) {
        toast.error("ผู้ใช้นี้มีสิทธิ์อยู่แล้ว");
        return;
      }
      const user = users.find(u => u.id === selectedUserId);
      if (!user) return;
      setAccessList([...accessList, { userId: selectedUserId, user }]);
      setSelectedUserId("");
    } else if (activeTab === "ROLE") {
      if (!selectedRole) return;
      if (accessList.some(a => a.role === selectedRole)) {
        toast.error("ตำแหน่งนี้มีสิทธิ์อยู่แล้ว");
        return;
      }
      setAccessList([...accessList, { role: selectedRole }]);
      setSelectedRole("");
    }
  };

  const handleRemoveAccess = (index: number) => {
    setAccessList(accessList.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const departmentIds = accessList.filter(a => a.departmentId).map(a => a.departmentId);
      const userIds = accessList.filter(a => a.userId).map(a => a.userId);
      const roles = accessList.filter(a => a.role).map(a => a.role);

      const res = await fetch(`/api/folders/${folderId}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentIds, userIds, roles }),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast.success("บันทึกสิทธิ์การเข้าถึงสำเร็จ");
      onClose();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const departmentAccesses = accessList.filter(a => a.departmentId);
  const userAccesses = accessList.filter(a => a.userId);
  const roleAccesses = accessList.filter(a => a.role);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl relative z-10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Shield size={24} className="text-blue-500" />
              จัดการสิทธิ์การเข้าถึง
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              โฟลเดอร์: <span className="font-semibold text-slate-700 dark:text-slate-300">{folderName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tabs */}
              <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                <button
                  onClick={() => setActiveTab("DEPARTMENT")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === "DEPARTMENT" 
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400" 
                      : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <Building2 size={18} /> ตามแผนก
                </button>
                <button
                  onClick={() => setActiveTab("USER")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === "USER" 
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400" 
                      : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <UserIcon size={18} /> ตามบุคคล
                </button>
                <button
                  onClick={() => setActiveTab("ROLE")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === "ROLE" 
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400" 
                      : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <BadgeCheck size={18} /> ตามตำแหน่ง
                </button>
              </div>

              {/* Add Access Form */}
              <div className="flex gap-2">
                {activeTab === "DEPARTMENT" && (
                  <select
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- เลือกแผนกที่ต้องการเพิ่มสิทธิ์ --</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                )}

                {activeTab === "USER" && (
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- เลือกบุคคลที่ต้องการเพิ่มสิทธิ์ --</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>{user.name} ({user.department?.name || 'ไม่มีสังกัด'})</option>
                    ))}
                  </select>
                )}

                {activeTab === "ROLE" && (
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- เลือกตำแหน่งที่ต้องการเพิ่มสิทธิ์ --</option>
                    {ROLES.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                )}

                <button
                  onClick={handleAddAccess}
                  disabled={(activeTab === 'DEPARTMENT' && !selectedDeptId) || (activeTab === 'USER' && !selectedUserId) || (activeTab === 'ROLE' && !selectedRole)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  <Plus size={18} /> เพิ่ม
                </button>
              </div>

              {/* Access Lists Display */}
              <div className="space-y-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                {accessList.length === 0 ? (
                  <div className="text-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                      เฉพาะเจ้าของแผนกเท่านั้นที่มองเห็น
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Departments Column */}
                    {departmentAccesses.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                          <Building2 size={16} className="text-slate-400" /> แผนกที่เข้าถึงได้
                        </h4>
                        <ul className="space-y-2">
                          {accessList.map((access, index) => access.departmentId && (
                            <li key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg">
                              <span className="text-slate-700 dark:text-white text-sm font-medium">
                                {access.department?.name}
                              </span>
                              <button onClick={() => handleRemoveAccess(index)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-lg transition-colors">
                                <Trash2 size={16} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Users Column */}
                    {userAccesses.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                          <UserIcon size={16} className="text-slate-400" /> บุคคลที่เข้าถึงได้
                        </h4>
                        <ul className="space-y-2">
                          {accessList.map((access, index) => access.userId && (
                            <li key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg">
                              <span className="text-slate-700 dark:text-white text-sm font-medium">
                                {access.user?.name}
                              </span>
                              <button onClick={() => handleRemoveAccess(index)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-lg transition-colors">
                                <Trash2 size={16} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Roles Column */}
                    {roleAccesses.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                          <BadgeCheck size={16} className="text-slate-400" /> ตำแหน่งที่เข้าถึงได้
                        </h4>
                        <ul className="space-y-2">
                          {accessList.map((access, index) => access.role && (
                            <li key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg">
                              <span className="text-slate-700 dark:text-white text-sm font-medium">
                                {ROLES.find(r => r.id === access.role)?.name || access.role}
                              </span>
                              <button onClick={() => handleRemoveAccess(index)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-lg transition-colors">
                                <Trash2 size={16} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 shrink-0 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || isSaving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              "บันทึกการเปลี่ยนแปลง"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

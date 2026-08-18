"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { Plus, Edit2, Trash2, Settings, PlusCircle, Trash, Search } from "lucide-react";

type FieldType = "text" | "number" | "date" | "select" | "textarea" | "checkbox" | "time" | "datetime-local" | "email" | "tel" | "url" | "radio";

interface SchemaField {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string; // Comma separated options for select/radio
  placeholder?: string;
  description?: string;
  defaultValue?: string;
}

interface DocumentType {
  id: string;
  name: string;
  description: string | null;
  departmentId: string | null;
  visibleTo: string[] | null;
  department?: { id: string; name: string };
  schema: SchemaField[];
}

export default function DocumentTypesPage() {
  const { data: session } = useSession();
  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibleTo, setVisibleTo] = useState<string[]>(["GLOBAL"]);
  const [fields, setFields] = useState<SchemaField[]>([]);
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDepartmentId, setFilterDepartmentId] = useState("ALL");

  useEffect(() => {
    fetchDocTypes();
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/departments");
      const data = await res.json();
      setDepartments(Array.isArray(data) ? data : (data.departments || []));
    } catch (error) {
      console.error("Failed to load departments", error);
    }
  };

  const fetchDocTypes = async () => {
    try {
      const res = await fetch("/api/document-types?manage=true");
      const data = await res.json();
      setDocTypes(data.documentTypes || []);
    } catch (error) {
      toast.error("Failed to load document types");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (docType?: DocumentType) => {
    if (docType) {
      setEditingId(docType.id);
      setName(docType.name);
      setDescription(docType.description || "");
      setVisibleTo((docType as any).visibleTo || ["GLOBAL"]);
      setFields(docType.schema || []);
    } else {
      setEditingId(null);
      setName("");
      setDescription("");
      setVisibleTo(["GLOBAL"]);
      setFields([]);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const addField = () => {
    setFields([...fields, { name: "", label: "", type: "text", required: false }]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, key: keyof SchemaField, value: any) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], [key]: value };
    // Auto-generate name from label if name is empty
    if (key === "label" && !newFields[index].name) {
       newFields[index].name = value.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }
    setFields(newFields);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("กรุณาระบุชื่อประเภทเอกสาร");
    if (fields.length === 0) return toast.error("กรุณาเพิ่มอย่างน้อย 1 ฟิลด์");
    if (fields.some(f => !f.name.trim() || !f.label.trim())) {
      return toast.error("กรุณากรอกข้อมูลฟิลด์ให้ครบถ้วน");
    }

    try {
      const payload = {
        name,
        description,
        visibleTo,
        schema: fields
      };

      const url = editingId ? `/api/document-types/${editingId}` : `/api/document-types`;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success("บันทึกสำเร็จ");
        fetchDocTypes();
        closeModal();
      } else {
        const error = await res.json();
        toast.error(error.error || "เกิดข้อผิดพลาด");
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบประเภทเอกสารนี้?")) return;
    try {
      const res = await fetch(`/api/document-types/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("ลบสำเร็จ");
        fetchDocTypes();
      } else {
        const error = await res.json();
        toast.error(error.error || "เกิดข้อผิดพลาด");
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด");
    }
  };

  const filteredDocTypes = docTypes.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Check if document type is visible to the selected department
    // "GLOBAL" means visible to all departments
    const isGlobal = doc.visibleTo && doc.visibleTo.includes("GLOBAL");
    const matchesDept = filterDepartmentId === "ALL" || isGlobal || (doc.visibleTo && doc.visibleTo.includes(filterDepartmentId));

    return matchesSearch && matchesDept;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {session?.user?.role !== "SUPER_ADMIN" ? (
        <div className="text-center mt-20">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-300">ปฏิเสธการเข้าถึง</h1>
          <p className="text-slate-500 dark:text-white mt-2">เฉพาะผู้ดูแลระบบส่วนกลาง (Dev) เท่านั้นที่สามารถจัดการประเภทเอกสารได้</p>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Settings className="text-blue-600" /> จัดการประเภทเอกสาร (Document Types)
              </h1>
              <p className="text-slate-500 mt-1">กำหนดโครงสร้างฟิลด์สำหรับเอกสารแต่ละประเภท</p>
            </div>
            <button
              onClick={() => openModal()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors"
            >
              <Plus size={20} />
              เพิ่มประเภทเอกสาร
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="relative w-full sm:max-w-md">
              <input
                type="text"
                placeholder="ค้นหาประเภทเอกสาร..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-white"
              />
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            </div>

            <div className="w-full sm:w-auto">
              <select
                value={filterDepartmentId}
                onChange={(e) => setFilterDepartmentId(e.target.value)}
                className="w-full sm:w-48 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-white"
              >
                <option value="ALL">ทุกแผนก</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">ชื่อประเภทเอกสาร</th>
              <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">แผนก</th>
              <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">จำนวนฟิลด์</th>
              <th className="p-4 font-semibold text-slate-600 dark:text-slate-300 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center p-8 text-slate-500">กำลังโหลด...</td></tr>
            ) : filteredDocTypes.length === 0 ? (
              <tr><td colSpan={4} className="text-center p-8 text-slate-500">ไม่พบประเภทเอกสารที่ค้นหา</td></tr>
            ) : (
              filteredDocTypes.map((doc) => (
                <tr key={doc.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-4">
                    <div className="font-medium text-slate-800 dark:text-white">{doc.name}</div>
                    <div className="text-sm text-slate-500">{doc.description}</div>
                  </td>
                  <td className="p-4 flex flex-wrap gap-1">
                    {doc.visibleTo && doc.visibleTo.length > 0 ? (
                      doc.visibleTo.includes("GLOBAL") ? (
                        <span className="px-2.5 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-medium">
                          ใช้งานได้ทุกแผนก
                        </span>
                      ) : (
                        doc.visibleTo.map(deptId => {
                          const d = departments.find(x => x.id === deptId);
                          return d ? (
                            <span key={deptId} className="px-2.5 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-xs font-medium">
                              {d.name}
                            </span>
                          ) : null;
                        })
                      )
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">
                    {doc.schema.length} ฟิลด์
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openModal(doc)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(doc.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                {editingId ? "แก้ไขประเภทเอกสาร" : "สร้างประเภทเอกสารใหม่"}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ชื่อประเภทเอกสาร *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="เช่น สัญญาจ้าง, ใบเสร็จรับเงิน"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">การมองเห็น (แผนกที่ใช้งานได้)</label>
                  <div className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg max-h-48 overflow-y-auto">
                    {departments.map((dept) => (
                      <label key={dept.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleTo.includes(dept.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setVisibleTo([...visibleTo, dept.id]);
                            } else {
                              setVisibleTo(visibleTo.filter(id => id !== dept.id));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">แผนก {dept.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">คำอธิบาย</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold text-slate-800 dark:text-white">ฟิลด์ข้อมูล (Custom Fields)</h4>
                  <button
                    type="button"
                    onClick={addField}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium flex items-center gap-1 text-sm"
                  >
                    <PlusCircle size={16} /> เพิ่มฟิลด์
                  </button>
                </div>
                
                {fields.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                    <p className="text-slate-500 text-sm">ยังไม่มีฟิลด์ข้อมูล กดเพิ่มฟิลด์เพื่อกำหนดโครงสร้าง</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <div key={index} className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex-1 grid grid-cols-12 gap-3">
                          <div className="col-span-4">
                            <label className="block text-xs font-medium text-slate-500 mb-1">ชื่อป้ายกำกับ (Label)</label>
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) => updateField(index, "label", e.target.value)}
                              placeholder="เช่น ชื่อคู่สัญญา"
                              className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div className="col-span-3">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Key Name</label>
                            <input
                              type="text"
                              value={field.name}
                              onChange={(e) => updateField(index, "name", e.target.value)}
                              placeholder="contract_name"
                              className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div className="col-span-3">
                            <label className="block text-xs font-medium text-slate-500 mb-1">ชนิดข้อมูล</label>
                            <select
                              value={field.type}
                              onChange={(e) => updateField(index, "type", e.target.value)}
                              className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md focus:outline-none focus:border-blue-500"
                            >
                              <option value="text">ข้อความ (Text)</option>
                              <option value="textarea">ข้อความยาว (Textarea)</option>
                              <option value="number">ตัวเลข (Number)</option>
                              <option value="date">วันที่ (Date)</option>
                              <option value="time">เวลา (Time)</option>
                              <option value="datetime-local">วันและเวลา (Date & Time)</option>
                              <option value="email">อีเมล (Email)</option>
                              <option value="tel">เบอร์โทรศัพท์ (Tel)</option>
                              <option value="url">ลิงก์/เว็บไซต์ (URL)</option>
                              <option value="select">ตัวเลือก (Dropdown)</option>
                              <option value="radio">ตัวเลือกวงกลม (Radio)</option>
                              <option value="checkbox">กล่องกาเครื่องหมาย (Checkbox)</option>
                            </select>
                          </div>
                          
                          {(field.type === "select" || field.type === "radio") && (
                            <div className="col-span-12">
                              <label className="block text-xs font-medium text-slate-500 mb-1">รายการตัวเลือก (คั่นด้วยลูกน้ำ ",")</label>
                              <input
                                type="text"
                                value={field.options || ""}
                                onChange={(e) => updateField(index, "options", e.target.value)}
                                placeholder="เช่น อนุมัติ, รอดำเนินการ, ปฏิเสธ"
                                className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md focus:outline-none focus:border-blue-500"
                              />
                            </div>
                          )}

                          {/* Advanced Config */}
                          <div className="col-span-4 mt-2">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Placeholder (ข้อความแนะนำ)</label>
                            <input
                              type="text"
                              value={field.placeholder || ""}
                              onChange={(e) => updateField(index, "placeholder", e.target.value)}
                              placeholder="เช่น กรุณากรอกอีเมล"
                              className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div className="col-span-4 mt-2">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Description (คำอธิบายใต้ช่อง)</label>
                            <input
                              type="text"
                              value={field.description || ""}
                              onChange={(e) => updateField(index, "description", e.target.value)}
                              placeholder="อธิบายว่าฟิลด์นี้คืออะไร"
                              className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div className="col-span-4 mt-2">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Default Value (ค่าเริ่มต้น)</label>
                            <input
                              type="text"
                              value={field.defaultValue || ""}
                              onChange={(e) => updateField(index, "defaultValue", e.target.value)}
                              placeholder="ค่าเริ่มต้น"
                              className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div className="col-span-12 flex items-center pt-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) => updateField(index, "required", e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded border-slate-300"
                              />
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">บังคับกรอก (Required)</span>
                            </label>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeField(index)}
                          className="p-1.5 mt-5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}

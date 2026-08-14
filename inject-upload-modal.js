const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/DocumentList.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Import UploadCloud
if (!content.includes('UploadCloud,')) {
  content = content.replace('  Link,', '  Link,\n  UploadCloud,');
}

// 2. Add State and Handler
if (!content.includes('const [uploadModal')) {
  const stateInjection = `  const [uploadModal, setUploadModal] = useState<{
    isOpen: boolean;
    file: File | null;
    title: string;
    documentType: string;
    documentCode: string;
    tags: string[];
    tagInput: string;
    description: string;
    isUploading: boolean;
  }>({
    isOpen: false,
    file: null,
    title: "",
    documentType: "ทั่วไป",
    documentCode: "",
    tags: [],
    tagInput: "",
    description: "",
    isUploading: false,
  });

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadModal.file) {
      toast.error("กรุณาเลือกไฟล์เอกสาร");
      return;
    }

    setUploadModal(prev => ({ ...prev, isUploading: true }));

    try {
      const formData = new FormData();
      formData.append("file", uploadModal.file);
      formData.append("title", uploadModal.title || uploadModal.file.name);
      formData.append("documentType", uploadModal.documentType);
      formData.append("documentCode", uploadModal.documentCode);
      formData.append("tags", JSON.stringify(uploadModal.tags));
      formData.append("description", uploadModal.description);

      const currentLevel = currentPath.length === 0 ? null : currentPath[currentPath.length - 1];
      if (currentLevel) {
        if (currentLevel.type === "department") {
           formData.append("departmentId", currentLevel.id);
        } else if (currentLevel.type === "folder") {
           const deptId = currentPath[0].id;
           formData.append("departmentId", deptId);
           formData.append("folderId", currentLevel.id);
        }
      }

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "อัปโหลดไม่สำเร็จ");
      }

      toast.success("อัปโหลดเอกสารสำเร็จ");
      setUploadModal({ ...uploadModal, isOpen: false, file: null, title: "", isUploading: false });
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message);
      setUploadModal(prev => ({ ...prev, isUploading: false }));
    }
  };

`;
  content = content.replace('  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);', stateInjection + '  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);');
}

// 3. Add Button
if (!content.includes('onClick={() => setUploadModal(prev => ({ ...prev, isOpen: true }))}')) {
  const buttonInjection = `
            {(currentUserRole === "SUPER_ADMIN" || currentUserRole === "DEPT_HEAD" || currentUserRole === "STAFF") && currentPath.length > 0 && (
              <button
                onClick={() => setUploadModal(prev => ({ ...prev, isOpen: true }))}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
              >
                <UploadCloud size={20} />
                อัปโหลดเอกสาร
              </button>
            )}
`;
  content = content.replace('<div className="flex items-center gap-2">\n            {(currentUserRole === "SUPER_ADMIN"', '<div className="flex items-center gap-2">' + buttonInjection + '\n            {(currentUserRole === "SUPER_ADMIN"');
}

// 4. Add JSX Modal
if (!content.includes('UploadCloud className="text-slate-400')) {
  const modalInjection = `
      {/* Upload Modal */}
      {uploadModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-600 flex items-center gap-2 bg-slate-50 dark:bg-slate-800">
              <UploadCloud className="text-slate-400 dark:text-white" size={20} />
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                อัปโหลดเอกสาร
              </h3>
            </div>
            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1">ไฟล์เอกสาร <span className="text-red-500">*</span></label>
                <input
                  type="file"
                  required
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setUploadModal(prev => ({ ...prev, file: e.target.files?.[0] || null, title: e.target.files?.[0]?.name || "" }))}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-slate-800 dark:file:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1">ชื่อเอกสาร</label>
                <input
                  type="text"
                  required
                  value={uploadModal.title}
                  onChange={(e) => setUploadModal(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="ปล่อยว่างเพื่อใช้ชื่อไฟล์"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1">ประเภท</label>
                  <select
                    value={uploadModal.documentType}
                    onChange={(e) => setUploadModal(prev => ({ ...prev, documentType: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="ทั่วไป">ทั่วไป</option>
                    <option value="สัญญา">สัญญา</option>
                    <option value="ใบแจ้งหนี้">ใบแจ้งหนี้</option>
                    <option value="รายงาน">รายงาน</option>
                    <option value="ประกาศ">ประกาศ</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1">เลขที่เอกสาร</label>
                  <input
                    type="text"
                    value={uploadModal.documentCode}
                    onChange={(e) => setUploadModal(prev => ({ ...prev, documentCode: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="อัตโนมัติ"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setUploadModal(prev => ({ ...prev, isOpen: false, file: null }))}
                  className="px-4 py-2 rounded-xl font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={uploadModal.isUploading}
                  className="px-4 py-2 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploadModal.isUploading ? "กำลังอัปโหลด..." : "อัปโหลด"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
`;
  content = content.replace('{/* Edit Modal */}', modalInjection + '\n      {/* Edit Modal */}');
}

fs.writeFileSync(filePath, content);
console.log('Successfully injected Upload Modal into DocumentList.tsx');

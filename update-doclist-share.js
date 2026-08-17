const fs = require('fs');
let c = fs.readFileSync('src/components/DocumentList.tsx', 'utf8');

// Add state for Share Modal
const stateAnchor = `const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);`;
const shareState = `
  const [shareModal, setShareModal] = useState<{ isOpen: boolean; doc: any | null }>({ isOpen: false, doc: null });
  const [sharePassword, setSharePassword] = useState("");
  const [shareExpiry, setShareExpiry] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
`;
if (!c.includes('setShareModal')) {
  c = c.replace(stateAnchor, stateAnchor + shareState);
}

// Add function to handle share
const funcAnchor = `const handleDelete = async () => {`;
const shareFunc = `
  const handleGenerateShareLink = async () => {
    if (!shareModal.doc) return;
    try {
      const res = await fetch(\`/api/documents/\${shareModal.doc.id}/share\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: sharePassword,
          expiresInDays: shareExpiry,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      const link = \`\${window.location.origin}/share/\${data.share.token}\`;
      setGeneratedLink(link);
      toast.success("สร้างลิงก์สำเร็จ");
    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาด");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    toast.success("คัดลอกลิงก์แล้ว");
  };
`;
if (!c.includes('handleGenerateShareLink')) {
  c = c.replace(funcAnchor, shareFunc + '\n  ' + funcAnchor);
}

// Add Share menu item
const menuAnchor = `<div className="py-1">`;
const shareMenu = `
                        {/* Share External */}
                        {(session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "DEPT_HEAD" || doc.uploaderId === session?.user?.id) && (
                          <button
                            onClick={() => {
                              setShareModal({ isOpen: true, doc });
                              setActiveDropdown(null);
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                          >
                            <Share2 size={16} className="mr-2" />
                            แชร์ให้คนนอก
                          </button>
                        )}
`;
if (!c.includes('แชร์ให้คนนอก')) {
  c = c.replace(menuAnchor, menuAnchor + shareMenu);
}

// Add Share Modal UI
const modalAnchor = `{/* History Modal */}`;
const shareModalUI = `
      {/* Share Modal */}
      {shareModal.isOpen && shareModal.doc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Share2 size={24} className="text-blue-500" />
                แชร์ให้คนนอก (External Share)
              </h2>
              <button 
                onClick={() => {
                  setShareModal({ isOpen: false, doc: null });
                  setGeneratedLink("");
                  setSharePassword("");
                  setShareExpiry("");
                }} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">เอกสารที่แชร์:</p>
                <p className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-sm">{shareModal.doc.title}</p>
              </div>

              {!generatedLink ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      ตั้งรหัสผ่าน (เว้นว่างได้ถ้าไม่ต้องการ)
                    </label>
                    <input
                      type="password"
                      value={sharePassword}
                      onChange={(e) => setSharePassword(e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500"
                      placeholder="ตั้งรหัสผ่าน..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      ลิงก์หมดอายุใน (วัน)
                    </label>
                    <input
                      type="number"
                      value={shareExpiry}
                      onChange={(e) => setShareExpiry(e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500"
                      placeholder="เช่น 7, 30 (เว้นว่างถ้าไม่มีวันหมดอายุ)"
                      min="1"
                    />
                  </div>
                  <button
                    onClick={handleGenerateShareLink}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                  >
                    สร้างลิงก์สำหรับแชร์
                  </button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl">
                    <p className="text-sm text-green-800 dark:text-green-300 font-medium mb-2">ลิงก์พร้อมใช้งานแล้ว!</p>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        readOnly 
                        value={generatedLink} 
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
                      />
                      <button 
                        onClick={copyToClipboard}
                        className="px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shrink-0"
                      >
                        คัดลอก
                      </button>
                    </div>
                  </div>
                  {sharePassword && (
                    <p className="text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 p-3 rounded-xl border border-orange-200 dark:border-orange-500/20">
                      ⚠️ อย่าลืมส่งรหัสผ่านให้ผู้รับด้วย ระบบไม่ได้แนบรหัสผ่านไปกับลิงก์
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

`;
if (!c.includes('Share Modal')) {
  c = c.replace(modalAnchor, shareModalUI + modalAnchor);
}

fs.writeFileSync('src/components/DocumentList.tsx', c);
console.log('DocumentList.tsx updated with External Share UI');

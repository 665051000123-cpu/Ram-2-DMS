const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/DocumentList.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize newlines for matching
content = content.replace(/\r\n/g, '\n');

// 1. Add Inbox and ScannerSelectionModal imports if not there
if (!content.includes('Inbox,')) {
    content = content.replace('  UploadCloud,\n  Unlink', '  UploadCloud,\n  Inbox,\n  Unlink');
}
if (!content.includes('ScannerSelectionModal')) {
    content = content.replace('import ConfirmModal from "./ConfirmModal";', 'import ConfirmModal from "./ConfirmModal";\nimport ScannerSelectionModal from "./ScannerSelectionModal";');
}
if (!content.includes('useRef')) {
    content = content.replace('import React, { useState, useMemo, useEffect } from "react";', 'import React, { useState, useMemo, useEffect, useRef } from "react";');
}

// 2. Add State for Edit Scanner Modal
const stateInjection = `
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [showEditScannerModal, setShowEditScannerModal] = useState(false);
  const handleEditScannerFileSelect = (newFile: File) => {
    setEditModal(prev => ({ ...prev, file: newFile }));
    setShowEditScannerModal(false);
  };
`;
if (!content.includes('const editFileInputRef = useRef')) {
    content = content.replace('  const [searchTerm, setSearchTerm] = useState("");', stateInjection + '\n  const [searchTerm, setSearchTerm] = useState("");');
}

// 3. Replace the Edit Modal File Input with regex targeting the exact label text and following input
// Regex explanation:
// <label[^>]*>\s*อัปโหลดไฟล์เวอร์ชันใหม่ \(ถ้ามี\)\s*<\/label>  <-- Matches the label
// \s*<input[^>]*type="file"[^>]*> <-- Matches the file input
const inputRegex = /<label[^>]*>\s*อัปโหลดไฟล์เวอร์ชันใหม่ \(ถ้ามี\)\s*<\/label>\s*<input[^>]*type="file"[\s\S]*?className="[^"]*"\s*\/>/g;

const newFileInputBlock = `<label className="block text-sm font-medium text-slate-700 dark:text-white mb-2">
                  อัปโหลดไฟล์เวอร์ชันใหม่ (ถ้ามี)
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="w-full sm:w-auto px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white font-medium rounded-lg shadow-sm hover:bg-slate-50 transition-all duration-200"
                  >
                    ค้นหาไฟล์ในเครื่อง
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEditScannerModal(true);
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-medium rounded-lg shadow-sm hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all duration-200 border border-blue-200 dark:border-blue-800 flex items-center justify-center gap-2"
                  >
                    <Inbox size={16} />
                    ดึงจากเครื่องสแกน
                  </button>
                </div>
                {editModal.file && (
                  <div className="mt-3 text-sm text-blue-600 dark:text-blue-400 font-medium bg-blue-50/50 dark:bg-blue-900/20 p-2 rounded-lg border border-blue-100 dark:border-blue-800">
                    ✅ เลือกไฟล์แล้ว: {editModal.file.name}
                  </div>
                )}
                <input
                  type="file"
                  ref={editFileInputRef}
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) =>
                    setEditModal({ ...editModal, file: e.target.files?.[0] || null })
                  }
                  className="hidden"
                />`;

content = content.replace(inputRegex, newFileInputBlock);

// Also need to add the ScannerSelectionModal component at the bottom of the JSX return
if (!content.includes('isOpen={showEditScannerModal}')) {
    content = content.replace('      {/* Upload Modal */}', `      <ScannerSelectionModal
        isOpen={showEditScannerModal}
        onClose={() => setShowEditScannerModal(false)}
        onFileSelect={handleEditScannerFileSelect}
      />
      
      {/* Upload Modal */}`);
}

fs.writeFileSync(filePath, content);
console.log("Successfully injected Scanner functionality into Edit Modal via Regex");

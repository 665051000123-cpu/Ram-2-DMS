const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/(dashboard)/upload/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add states
content = content.replace(
  'const [documentType, setDocumentType] = useState("");',
  `const [documentTypeId, setDocumentTypeId] = useState("");
  const [docTypes, setDocTypes] = useState<any[]>([]);
  const [customFieldsData, setCustomFieldsData] = useState<Record<string, any>>({});`
);

// 2. Remove savedDocTypes states
content = content.replace(
  /const \[savedDocTypes, setSavedDocTypes\][\s\S]*?const \[isDocTypeOpen, setIsDocTypeOpen\] = useState\(false\);\n  const docTypeRef = useRef<HTMLDivElement>\(null\);/m,
  ''
);

// 3. Update useEffect to fetch document types
content = content.replace(
  'fetch("/api/folders?myDeptOnly=true"),',
  'fetch("/api/folders?myDeptOnly=true"),\n          fetch("/api/document-types"),'
);
content = content.replace(
  'const [resFolders, resSettings] = await Promise.all([',
  'const [resFolders, resDocTypes, resSettings] = await Promise.all(['
);
content = content.replace(
  'if (resFolders.ok) {',
  `if (resDocTypes.ok) {
          const docTypeData = await resDocTypes.json();
          setDocTypes(docTypeData.documentTypes || []);
        }
        if (resFolders.ok) {`
);

// 4. Remove handleSaveDocType
content = content.replace(
  /const handleSaveDocType = \(\) => \{[\s\S]*?\};\n/m,
  ''
);

// 5. Update executeUpload to use documentTypeId and customFields
content = content.replace(
  'const finalDocType = isBulkMode && uploadObj.documentType ? uploadObj.documentType : documentType;',
  ''
);
content = content.replace(
  'formData.append("documentType", finalDocType);',
  'if (documentTypeId) formData.append("documentTypeId", documentTypeId);\n        formData.append("customFields", JSON.stringify(customFieldsData));'
);

// 6. Remove documentType from newFileObj in bulk mode
content = content.replace(
  'documentType: ""',
  ''
);

// 7. Remove documentType input in bulk mode UI
content = content.replace(
  /<div>\s*<label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">\s*ประเภทเอกสาร \(ระบุแยกรายไฟล์\)\s*<\/label>[\s\S]*?<\/div>\s*<div>\s*<label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">\s*ชื่อเอกสาร/m,
  `<div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                              ชื่อเอกสาร`
);

// 8. Replace document type dropdown UI
const oldDropdownUI = `<div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1.5">
                  ประเภทเอกสาร
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1" ref={docTypeRef}>
                    <input
                      value={documentType}
                      onChange={(e) => {
                        setDocumentType(e.target.value);
                        setIsDocTypeOpen(true);
                      }}
                      onFocus={() => setIsDocTypeOpen(true)}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all pr-10"
                      placeholder="เลือกหรือพิมพ์ประเภทเอกสารใหม่..."
                    />
                    <button
                      type="button"
                      onClick={() => setIsDocTypeOpen(!isDocTypeOpen)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <ChevronDown size={20} />
                    </button>

                    {isDocTypeOpen && savedDocTypes && savedDocTypes.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-60 overflow-y-auto py-1">
                        {savedDocTypes.map((type, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setDocumentType(type);
                              setIsDocTypeOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveDocType}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors dark:bg-slate-700 transition-colors text-slate-700 dark:text-white text-sm font-medium rounded-xl transition whitespace-nowrap shrink-0"
                  >
                    บันทึกประเภท
                  </button>
                </div>
              </div>`;

const newDropdownUI = `<div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1.5">
                  ประเภทเอกสาร (Document Type)
                </label>
                <select
                  value={documentTypeId}
                  onChange={(e) => {
                    setDocumentTypeId(e.target.value);
                    setCustomFieldsData({}); // Reset custom fields when type changes
                  }}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                >
                  <option value="">-- ไม่ระบุประเภท (เอกสารทั่วไป) --</option>
                  {docTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} {type.departmentId ? \` (เฉพาะแผนก \${type.department?.name})\` : " (Global)"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Custom Fields */}
              {documentTypeId && docTypes.find(t => t.id === documentTypeId)?.schema?.map((field: any, idx: number) => (
                <div key={idx} className="md:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-white mb-1.5">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                    required={field.required}
                    value={customFieldsData[field.name] || ''}
                    onChange={(e) => setCustomFieldsData({ ...customFieldsData, [field.name]: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 transition-colors border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  />
                </div>
              ))}
              `;

content = content.replace(oldDropdownUI, newDropdownUI);

// 9. Remove unused localStorage logic for docTypes
content = content.replace(
  /const loadedDocTypes = localStorage.getItem\("dms_saved_doctypes"\);\n    if \(loadedDocTypes\) \{\n      setSavedDocTypes\(JSON.parse\(loadedDocTypes\)\);\n    \}\n/m,
  ''
);

// 10. Update form reset
content = content.replace(
  'setDocumentType("");',
  'setDocumentTypeId("");\n        setCustomFieldsData({});'
);

fs.writeFileSync(filePath, content);
console.log("Rewritten upload page successfully");

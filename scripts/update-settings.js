const fs = require('fs');
const file = 'src/components/StorageSettings.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </div>`;

const replacement = target + `

        <hr className="border-slate-200 dark:border-slate-700 my-6" />

        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">ประเภทไฟล์ที่อนุญาต</h3>
          <p className="text-sm text-slate-500 dark:text-white mb-4">
            กำหนดนามสกุลไฟล์ที่อนุญาตให้อัปโหลดเข้าสู่ระบบ (คั่นด้วยลูกน้ำ ,)
          </p>
          
          <label className="block text-sm font-medium text-slate-700 dark:text-white mb-2">
            นามสกุลไฟล์ (เช่น pdf, jpg, png, docx)
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={allowedFileTypes}
              onChange={(e) => setAllowedFileTypes(e.target.value)}
              className="flex-1 max-w-[400px] rounded-lg border-slate-200 dark:border-slate-600 border p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="pdf, jpg, png, docx, xlsx"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </div>`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content, 'utf8');
console.log('Update complete');

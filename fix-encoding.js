const fs = require('fs');
let c = fs.readFileSync('src/app/(dashboard)/page.tsx', 'utf8');

const regex = /<\/div><\/div><\/div><div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">[\s\S]*/;

const fixedJSX = `          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl border border-slate-200 dark:border-slate-600 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-600">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">เอกสารที่มีการดาวน์โหลดสูงสุด</h3>
          </div>
          <div className="p-2">
            {topDownloadedDocs.length > 0 ? (
              topDownloadedDocs.map((item, idx) => (
                <div key={item.documentId} className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-white truncate">{item.doc?.title}</p>
                    <p className="text-xs text-slate-500 dark:text-white truncate">{item.doc?.documentType || "ไม่ระบุ"}</p>
                  </div>
                  <div className="text-sm font-bold text-blue-600 dark:text-blue-400">{item._count.id} ครั้ง</div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500 dark:text-white text-sm">ยังไม่มีข้อมูลการดาวน์โหลด</div>
            )}
          </div>
        </div>

        {session.user.role === "SUPER_ADMIN" && (
          <div className="bg-white dark:bg-slate-900 transition-colors rounded-2xl border border-slate-200 dark:border-slate-600 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-600">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">แผนกที่อัปโหลดเอกสารมากที่สุด</h3>
            </div>
            <div className="p-2">
              {topDepartmentsData.length > 0 ? (
                topDepartmentsData.map((item, idx) => (
                  <div key={item.departmentId} className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">{idx + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-white truncate">{item.dept?.name}</p>
                    </div>
                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{item._count.id} ไฟล์</div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500 dark:text-white text-sm">ยังไม่มีข้อมูล</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
`;

c = c.replace(regex, fixedJSX);
fs.writeFileSync('src/app/(dashboard)/page.tsx', c);
console.log('Fixed dashboard text corruption!');

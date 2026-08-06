'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, UploadCloud, Users, Settings, Activity } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const menuItems = [
    { icon: LayoutDashboard, label: 'แดชบอร์ด', href: '/' },
    { icon: FileText, label: 'เอกสารทั้งหมด', href: '/documents' },
    { icon: UploadCloud, label: 'อัปโหลดเอกสาร', href: '/upload' },
  ];

  // ถ้าไม่ใช่ STAFF (คือหัวหน้าแผนก หรือ Admin) ค่อยให้เห็นเมนูขั้นสูง
  if (session?.user?.role === 'SUPER_ADMIN' || session?.user?.role === 'DEPARTMENT_HEAD') {
    menuItems.push({ icon: Activity, label: 'ประวัติการใช้งาน', href: '/audit-logs' });
    menuItems.push({ icon: Users, label: 'จัดการผู้ใช้งาน', href: '/users' });
    menuItems.push({ icon: Settings, label: 'ตั้งค่าระบบ', href: '/settings' });
  }

  return (
    <div className="w-64 bg-slate-900 text-white h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold tracking-wider text-blue-400">RAM2 <span className="text-white">DMS</span></h1>
        <p className="text-slate-400 text-xs mt-1">ระบบจัดการเอกสารอิเล็กทรอนิกส์</p>
      </div>
      <nav className="flex-1 p-4 space-y-2 mt-4">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} /> {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
        © 2026 Ram 2 Hospital
      </div>
    </div>
  );
}

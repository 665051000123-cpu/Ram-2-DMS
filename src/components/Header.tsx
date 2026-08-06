'use client';

import { UserCircle, LogOut } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import NotificationBell from './NotificationBell';

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 shadow-sm">
      <div className="text-xl font-semibold text-slate-800 flex items-baseline gap-2">
        <span>ยินดีต้อนรับ, {session?.user?.name || 'สมชาย ใจดี'}</span>
        <span className="text-sm font-medium text-slate-500">({session?.user?.departmentName || 'DEV'})</span>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 border-l pl-6 border-slate-200">
          <div className="text-right">
            <div className="text-sm font-medium text-slate-900">{session?.user?.name || 'สมชาย ใจดี'}</div>
            <div className="text-xs text-slate-500">{session?.user?.role || 'พยาบาลวิชาชีพ'}</div>
          </div>
          <NotificationBell />
          <Link href="/profile" className="hover:opacity-80 transition" title="โปรไฟล์ของฉัน">
            <UserCircle size={36} className="text-slate-300 hover:text-blue-500" />
          </Link>
          <button 
            onClick={() => signOut()}
            className="text-slate-400 hover:text-red-500 transition ml-2"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}

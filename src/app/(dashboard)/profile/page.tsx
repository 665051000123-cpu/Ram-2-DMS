'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { UserCircle, Shield, Key } from 'lucide-react';

export default function ProfilePage() {
  const { data: session } = useSession();
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: session?.user?.id, 
          oldPassword, 
          newPassword 
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
      }

      toast.success('เปลี่ยนรหัสผ่านสำเร็จ');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!session?.user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">โปรไฟล์ส่วนตัว</h1>
        <p className="text-slate-500 mt-1">
          จัดการข้อมูลบัญชีผู้ใช้และรหัสผ่านของคุณ
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ข้อมูลบัญชี */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
              <UserCircle size={48} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">{session.user.name}</h2>
            <p className="text-slate-500 mt-1">{session.user.email}</p>
            
            <div className="w-full mt-6 pt-6 border-t border-slate-100 space-y-3 text-left">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">แผนก</p>
                <p className="text-slate-800 font-medium">{session.user.departmentName || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">สิทธิ์การใช้งาน</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Shield size={14} className="text-blue-500" />
                  <span className="text-slate-800 font-medium">
                    {session.user.role === 'SUPER_ADMIN' ? 'Super Admin' : session.user.role === 'DEPARTMENT_HEAD' ? 'หัวหน้าแผนก' : 'เจ้าหน้าที่'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* เปลี่ยนรหัสผ่าน */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-center gap-2">
              <Key className="text-slate-400" />
              <h2 className="text-lg font-bold text-slate-800">เปลี่ยนรหัสผ่าน</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">รหัสผ่านปัจจุบัน</label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">รหัสผ่านใหม่</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="••••••••"
                />
                <p className="text-xs text-slate-500 mt-1">รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ยืนยันรหัสผ่านใหม่</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={loading || !oldPassword || !newPassword || !confirmPassword}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import ForcePasswordChange from '@/components/ForcePasswordChange';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <div className="flex min-h-screen bg-slate-50 w-full">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <Header />
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
      {session?.user && (session.user as any).forcePasswordChange && <ForcePasswordChange />}
    </div>
  );
}

import AppLayoutClient from '@/components/AppLayoutClient';
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
      <AppLayoutClient>
        {children}
      </AppLayoutClient>
      {session?.user && (session.user as any).forcePasswordChange && <ForcePasswordChange />}
    </div>
  );
}

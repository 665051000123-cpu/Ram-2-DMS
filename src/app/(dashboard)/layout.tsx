import AppLayoutClient from "@/components/AppLayoutClient";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import ForcePasswordChange from "@/components/ForcePasswordChange";
import IdleTimer from "@/components/IdleTimer";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 w-full transition-colors duration-200">
      <IdleTimer />
      <AppLayoutClient>{children}</AppLayoutClient>
      {session?.user && (session.user as any).forcePasswordChange && (
        <ForcePasswordChange />
      )}
    </div>
  );
}

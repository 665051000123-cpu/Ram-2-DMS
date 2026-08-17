"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { usePermissions } from "@/hooks/usePermissions";
import {
  FileText,
  UploadCloud,
  Users,
  Settings,
  Activity,
  Trash2,
  Menu,
  PieChart,
  LayoutGrid,
} from "lucide-react";

export default function Sidebar({
  isCollapsed = false,
  onToggle,
}: {
  isCollapsed?: boolean;
  onToggle?: () => void;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { permissions, loading: permissionsLoading } = usePermissions(session?.user?.role);

  const menuItems = [
    { icon: LayoutGrid, label: "แดชบอร์ด", href: "/" },
    { icon: FileText, label: "เอกสารของฉัน", href: "/documents" },
    { icon: UploadCloud, label: "อัปโหลดเอกสาร", href: "/upload" },
  ];

  // Dynamically add menus based on permissions
  if (permissions && !permissionsLoading) {
    if (permissions.menu_trash) {
      menuItems.push({ icon: Trash2, label: "ถังขยะ", href: "/recycle-bin" });
      menuItems.push({ icon: FileText, label: "เอกสารรอทำลาย", href: "/expired-documents" });
    }
    if (permissions.menu_audit) {
      menuItems.push({
        icon: Activity,
        label: "ประวัติการใช้งาน",
        href: "/audit-logs",
      });
    }
    if (permissions.menu_users) {
      menuItems.push({ icon: Users, label: "จัดการผู้ใช้งาน", href: "/users" });
    }
  }

  // จัดการประเภทเอกสาร และ ตั้งค่าระบบ เฉพาะ SUPER_ADMIN
  if (session?.user?.role === "SUPER_ADMIN") {
    menuItems.push({ icon: Settings, label: "จัดการประเภทเอกสาร", href: "/document-types" });
    menuItems.push({ icon: Settings, label: "ตั้งค่าระบบ", href: "/settings" });
  }

  // Analytics เฉพาะ SUPER_ADMIN
  if (session?.user?.role === "SUPER_ADMIN") {
    menuItems.push({
      icon: PieChart,
      label: "สถิติและรายงาน",
      href: "/analytics",
    });
  }

  return (
    <div
      className={`bg-slate-900 text-white h-screen flex flex-col fixed left-0 top-0 transition-all duration-300 z-50 ${isCollapsed ? "w-20" : "w-64"}`}
    >
      <div
        className={`p-4 md:p-6 border-b border-slate-800 flex items-center ${isCollapsed ? "flex-col gap-4 justify-center" : "justify-between"}`}
      >
        {!isCollapsed ? (
          <div>
            <h1 className="text-xl font-bold tracking-wider text-blue-400">
              RAM2 <span className="text-white">DMS</span>
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              ระบบจัดการเอกสารอิเล็กทรอนิกส์
            </p>
          </div>
        ) : (
          <h1 className="text-xl font-bold text-blue-400 mt-2">
            R<span className="text-white">2</span>
          </h1>
        )}

        {onToggle && (
          <button
            onClick={onToggle}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
            title={isCollapsed ? "ขยายแถบเมนู" : "ย่อแถบเมนู"}
          >
            <Menu size={20} />
          </button>
        )}
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-hide">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center p-3 rounded-lg transition-colors whitespace-nowrap ${
                isCollapsed ? "justify-center" : "gap-3"
              } ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon size={20} className="shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800 flex flex-col items-center justify-center">
        {!isCollapsed ? (
          <div className="text-xs text-slate-500 text-center">
            © 2026 Ram 2 Hospital
          </div>
        ) : (
          <div className="text-[10px] text-slate-500 text-center">© 2026</div>
        )}
      </div>
    </div>
  );
}

import { prisma } from "./prisma";
import { AllPermissions, RolePermissions, DEFAULT_PERMISSIONS, SUPER_ADMIN_PERMISSIONS } from "./permissions";

/**
 * ดึงข้อมูลสิทธิ์การใช้งานจากฐานข้อมูล
 * ถ้าไม่มีข้อมูลจะคืนค่า default
 */
export async function getAllPermissions(): Promise<AllPermissions> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "ROLE_PERMISSIONS" },
    });
    
    if (setting && setting.value) {
      return JSON.parse(setting.value) as AllPermissions;
    }
  } catch (error) {
    console.error("Error loading permissions:", error);
  }
  
  return DEFAULT_PERMISSIONS;
}

/**
 * ดึงสิทธิ์ของ Role เฉพาะ
 */
export async function getRolePermissions(role: string): Promise<RolePermissions> {
  if (role === "SUPER_ADMIN") return SUPER_ADMIN_PERMISSIONS;
  
  const allPermissions = await getAllPermissions();
  if (role === "DEPT_HEAD") return allPermissions.DEPT_HEAD;
  if (role === "STAFF") return allPermissions.STAFF;
  
  // Default for unknown roles
  return DEFAULT_PERMISSIONS.STAFF;
}

"use client";

import { useState, useEffect } from "react";
import { RolePermissions, AllPermissions, SUPER_ADMIN_PERMISSIONS, DEFAULT_PERMISSIONS } from "@/lib/permissions";

export function usePermissions(role: string | undefined) {
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!role) {
      setPermissions(null);
      setLoading(false);
      return;
    }

    if (role === "SUPER_ADMIN") {
      setPermissions(SUPER_ADMIN_PERMISSIONS);
      setLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        const res = await fetch("/api/settings/permissions");
        if (res.ok) {
          const data = (await res.json()) as AllPermissions;
          if (role === "DEPT_HEAD") setPermissions(data.DEPT_HEAD);
          else if (role === "STAFF") setPermissions(data.STAFF);
          else setPermissions(DEFAULT_PERMISSIONS.STAFF);
        } else {
          setPermissions(DEFAULT_PERMISSIONS.STAFF);
        }
      } catch (error) {
        console.error("Failed to fetch permissions", error);
        if (role === "DEPT_HEAD") setPermissions(DEFAULT_PERMISSIONS.DEPT_HEAD);
        else setPermissions(DEFAULT_PERMISSIONS.STAFF);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [role]);

  return { permissions, loading };
}

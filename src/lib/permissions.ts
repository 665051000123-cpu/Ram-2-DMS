export interface RolePermissions {
  menu_trash: boolean;
  menu_audit: boolean;
  menu_users: boolean;
  doc_edit: boolean;
  doc_delete: boolean;
}

export interface AllPermissions {
  DEPT_HEAD: RolePermissions;
  STAFF: RolePermissions;
}

export const DEFAULT_PERMISSIONS: AllPermissions = {
  DEPT_HEAD: {
    menu_trash: true,
    menu_audit: true,
    menu_users: true,
    doc_edit: true,
    doc_delete: true,
  },
  STAFF: {
    menu_trash: false,
    menu_audit: false,
    menu_users: false,
    doc_edit: false,
    doc_delete: false,
  },
};

export const SUPER_ADMIN_PERMISSIONS: RolePermissions = {
  menu_trash: true,
  menu_audit: true,
  menu_users: true,
  doc_edit: true,
  doc_delete: true,
};

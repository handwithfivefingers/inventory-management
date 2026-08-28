import { usePermissionStore } from "~/store/permission.store";
import { IPermission, IRole } from "~/types/user";

/**
 * Pure permission check shared by hooks and non-hook contexts (sidebar
 * filtering, loaders). Mirrors the backend's exact-match rule: the module key
 * must equal `permission.name`, and the admin role bypasses all checks.
 */
export const checkPermission = (role: IRole, moduleName: string, action: IPermission["method"]): boolean => {
  // if (!roles?.length) return false;
  if (role?.isAdmin) return true;
  return role?.permissions?.some(
    (permission: IPermission) =>
      (!moduleName || permission.name.toLowerCase() === moduleName.toLowerCase()) && permission.method === action,
  );
};

/**
 * Hook to check if user has specific permission
 * @param permissionCode - Permission code to check ('C', 'R', 'U', 'D')
 * @param moduleName - Optional module name to check against permission name
 * @returns boolean - true if user has permission
 */
export const usePermission = (action: IPermission["method"], moduleName?: string): boolean => {
  const isAdmin = useIsAdmin();
  const role = usePermissionStore();
  if (isAdmin) return isAdmin;
  if (!moduleName) return false;
  return checkPermission(role, moduleName, action) || isAdmin;
};

/**
 * Hook to check if user has specific permission for a resource
 * @param resource - Resource name (e.g., 'product', 'order', 'warehouse')
 * @param action - Action type ('create', 'read', 'update', 'delete')
 * @returns boolean - true if user has permission
 */
export const useResourcePermission = (resource: string, action: "create" | "read" | "update" | "delete"): boolean => {
  const actionMap = {
    create: "CREATE",
    read: "READ",
    update: "UPDATE",
    delete: "DELETE",
  } as const;

  const permissionCode = actionMap[action];
  return usePermission(permissionCode, resource);
};

/**
 * Hook to check if user has admin role
 * @returns boolean - true if user is admin
 */
export const useIsAdmin = (): boolean => {
  const isAdmin = usePermissionStore().isAdmin;
  return !!isAdmin;
};

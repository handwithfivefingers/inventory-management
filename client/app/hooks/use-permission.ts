import { useUser } from "~/store/user.store";
import { IPermission, IRole } from "~/types/user";

/**
 * Pure permission check shared by hooks and non-hook contexts (sidebar
 * filtering, loaders). Mirrors the backend's exact-match rule: the module key
 * must equal `permission.name`, and the admin role bypasses all checks.
 */
export const checkPermission = (
  roles: IRole[] | undefined,
  moduleName?: string,
  permissionCode: "C" | "R" | "U" | "D" = "R",
): boolean => {
  if (!roles?.length) return false;

  return roles.some((role) => {
    if (role.name?.toLowerCase() === "admin") return true;
    if (!role.permissions?.length) return false;

    return role.permissions.some(
      (permission: IPermission) =>
        (!moduleName || permission.name.toLowerCase() === moduleName.toLowerCase()) && permission[permissionCode],
    );
  });
};

/**
 * Hook to check if user has specific permission
 * @param permissionCode - Permission code to check ('C', 'R', 'U', 'D')
 * @param moduleName - Optional module name to check against permission name
 * @returns boolean - true if user has permission
 */
export const usePermission = (permissionCode: "C" | "R" | "U" | "D", moduleName?: string): boolean => {
  const { user } = useUser();
  const isAdmin = useIsAdmin();
  return checkPermission(user?.roles, moduleName, permissionCode) || isAdmin;
};

/**
 * Hook to check if user has specific permission for a resource
 * @param resource - Resource name (e.g., 'product', 'order', 'warehouse')
 * @param action - Action type ('create', 'read', 'update', 'delete')
 * @returns boolean - true if user has permission
 */
export const useResourcePermission = (resource: string, action: "create" | "read" | "update" | "delete"): boolean => {
  const actionMap = {
    create: "C",
    read: "R",
    update: "U",
    delete: "D",
  } as const;

  const permissionCode = actionMap[action];
  return usePermission(permissionCode, resource);
};

/**
 * Hook to get all permissions for current user
 * @returns IPermission[] - Array of all permissions
 */
export const useAllPermissions = (): IPermission[] => {
  const { user } = useUser();

  if (!user?.roles) {
    return [];
  }

  // Collect all unique permissions from all roles
  const permissionMap = new Map<number, IPermission>();

  user.roles.forEach((role) => {
    role.permissions?.forEach((permission: IPermission) => {
      if (!permissionMap.has(permission.id)) {
        permissionMap.set(permission.id, permission);
      }
    });
  });

  return Array.from(permissionMap.values());
};

/**
 * Hook to check if user has admin role
 * @returns boolean - true if user is admin
 */
export const useIsAdmin = (): boolean => {
  const { roles } = useUser();
  if (!roles) {
    return false;
  }
  return roles.some((role) => role.name.toLowerCase() === "admin" || role.name.toLowerCase() === "administrator");
};

/**
 * Hook to check if user has any role
 * @param roleNames - Array of role names to check
 * @returns boolean - true if user has any of the specified roles
 */
export const useHasRole = (roleNames: string[]): boolean => {
  const { user } = useUser();

  if (!user?.roles) {
    return false;
  }

  return user.roles.some((role) => roleNames.some((name) => role.name.toLowerCase() === name.toLowerCase()));
};

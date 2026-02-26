import { ReactNode } from "react";
import { usePermission, useIsAdmin, useHasRole } from "~/hooks/use-permission";
import { cn } from "~/libs/utils";

interface PermissionGuardProps {
  children: ReactNode;
  permission?: "C" | "R" | "U" | "D";
  module?: string;
  roles?: string[];
  requireAdmin?: boolean;
  fallback?: ReactNode;
  className?: string;
}

/**
 * PermissionGuard Component
 *
 * Usage examples:
 *
 * 1. Check for create permission on products:
 * <PermissionGuard permission="C" module="product">
 *   <button>Add Product</button>
 * </PermissionGuard>
 *
 * 2. Check for admin role:
 * <PermissionGuard requireAdmin>
 *   <AdminPanel />
 * </PermissionGuard>
 *
 * 3. Check for specific roles:
 * <PermissionGuard roles={['Manager', 'Supervisor']}>
 *   <ManagerActions />
 * </PermissionGuard>
 *
 * 4. Multiple conditions:
 * <PermissionGuard permission="U" module="order" requireAdmin>
 *   <EditOrderButton />
 * </PermissionGuard>
 */
export const PermissionGuard = ({
  children,
  permission,
  module,
  roles,
  requireAdmin = false,
  fallback = null,
  className,
}: PermissionGuardProps) => {
  const hasPermission = usePermission(permission!, module);
  console.log("hasPermission", hasPermission);
  console.log("permission", permission);
  const isAdmin = useIsAdmin();
  const hasRole = useHasRole(roles || []);

  // Check if all conditions are met
  const isAllowed = () => {
    // If requireAdmin is true, user must be admin
    if (requireAdmin && !isAdmin) {
      return false;
    }

    // If roles are specified, user must have one of those roles
    if (roles && roles.length > 0 && !hasRole) {
      return false;
    }

    // If permission is specified, user must have that permission
    if (permission && !hasPermission) {
      return false;
    }

    return true;
  };

  if (isAllowed()) {
    return <div className={cn("inline", className)}>{children}</div>;
  }

  return <>{fallback}</>;
};

/**
 * PermissionButton Component
 * A button that is disabled/hidden based on permissions
 */
interface PermissionButtonProps extends PermissionGuardProps {
  onClick?: () => void;
  disabled?: boolean;
  hideIfNoPermission?: boolean;
}

export const PermissionButton = ({
  children,
  onClick,
  permission,
  module,
  roles,
  requireAdmin = false,
  disabled = false,
  hideIfNoPermission = false,
}: PermissionButtonProps) => {
  const hasPermission = usePermission(permission!, module);
  const isAdmin = useIsAdmin();
  const hasRole = useHasRole(roles || []);

  const isAllowed = () => {
    if (requireAdmin && !isAdmin) return false;
    if (roles && roles.length > 0 && !hasRole) return false;
    if (permission && !hasPermission) return false;
    return true;
  };

  const allowed = isAllowed();

  if (hideIfNoPermission && !allowed) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || !allowed}
      className={cn(
        "px-4 py-2 rounded-md font-medium transition-colors",
        allowed ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-gray-300 text-gray-500 cursor-not-allowed",
      )}
    >
      {children}
    </button>
  );
};

export default PermissionGuard;

import { ReactNode } from "react";
import { useIsAdmin, usePermission } from "~/hooks/use-permission";
import { cn } from "~/libs/utils";
import { IPermission } from "~/types/user";

interface PermissionGuardProps {
  children: ReactNode;
  permission?: IPermission["method"];
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
 * <PermissionGuard permission="CREATE" module="product">
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
 * <PermissionGuard permission="UPDATE" module="order" requireAdmin>
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
  const isAdmin = useIsAdmin();
  const isAllowed = () => {
    if (requireAdmin && isAdmin) return true;
    if (roles && roles.length > 0) return true;
    // Fix: previously returned `false` here, hiding children even when the
    // permission WAS granted.
    if (permission && hasPermission) return true;
    return false;
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
  // const hasRole = useHasRole(roles || []);

  const isAllowed = () => {
    if (requireAdmin && !isAdmin) return false;
    if (roles && roles.length > 0) return false;
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

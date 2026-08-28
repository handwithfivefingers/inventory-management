# Permission System Documentation

## Overview
The permission system allows you to control access to features and routes based on user roles and permissions.

## Permission Structure
- **C** - Create
- **R** - Read
- **U** - Update
- **D** - Delete

## Usage Examples

### 1. Using PermissionGuard Component

```tsx
import { PermissionGuard } from "~/components/permission-guard";

// Show button only if user has create permission for products
<PermissionGuard permission="CREATE" module="product">
  <button>Tạo sản phẩm mới</button>
</PermissionGuard>

// Show admin panel only for admins
<PermissionGuard requireAdmin>
  <AdminPanel />
</PermissionGuard>

// Show for specific roles
<PermissionGuard roles={['Manager', 'Supervisor']}>
  <ManagerActions />
</PermissionGuard>

// Combine conditions
<PermissionGuard permission="UPDATE" module="order" requireAdmin>
  <EditOrderButton />
</PermissionGuard>
```

### 2. Using Permission Hooks

```tsx
import { 
  usePermission, 
  useResourcePermission,
  useIsAdmin,
  useHasRole 
} from "~/hooks/use-permission";

function MyComponent() {
  // Check for create permission
  const canCreate = usePermission('C', 'product');
  
  // Check for resource-specific permission
  const canReadOrders = useResourcePermission('order', 'read');
  
  // Check if admin
  const isAdmin = useIsAdmin();
  
  // Check for specific roles
  const isManager = useHasRole(['Manager', 'Supervisor']);
  
  return (
    <div>
      {canCreate && <button>Create Product</button>}
      {isAdmin && <button>Admin Actions</button>}
    </div>
  );
}
```

### 3. Using PermissionButton Component

```tsx
import { PermissionButton } from "~/components/permission-guard";

// Button disabled if no permission
<PermissionButton permission="CREATE" module="product">
  Create Product
</PermissionButton>

// Button hidden if no permission
<PermissionButton permission="CREATE" module="product" hideIfNoPermission>
  Create Product
</PermissionButton>
```

### 4. Route Guards (Server-side)

```tsx
import { requireAuth, requireAdmin, requirePermission } from "~/libs/route-guard";

export async function loader({ request }: LoaderFunctionArgs) {
  // Require authentication
  const session = await requireAuth(request);
  
  // Require admin
  await requireAdmin(request);
  
  // Require specific permission
  await requirePermission(request, 'C', 'product');
  
  // Your loader logic here
}
```

## Permission Names

Permissions should follow this naming convention:
- `product` - Product management
- `order` - Order management
- `warehouse` - Warehouse management
- `vendor` - Vendor management
- `user` - User management
- `role` - Role management
- `permission` - Permission management
- `financial` - Financial management

## Best Practices

1. **Always check permissions on both client and server side**
   - Client-side for UI/UX
   - Server-side for security

2. **Use specific module names**
   - Instead of just checking 'C', check 'C' for 'product'

3. **Provide clear fallback UI**
   - Hide or disable features gracefully
   - Show helpful messages when access is denied

4. **Test with different roles**
   - Admin
   - Manager
   - Regular user
   - Guest

## Examples by Feature

### Product Management
```tsx
<PermissionGuard permission="CREATE" module="product">
  <Button>Add Product</Button>
</PermissionGuard>

<PermissionGuard permission="UPDATE" module="product">
  <Button>Edit Product</Button>
</PermissionGuard>

<PermissionGuard permission="DELETE" module="product">
  <Button>Delete Product</Button>
</PermissionGuard>
```

### Order Management
```tsx
const { useResourcePermission } = usePermission();
const canReadOrders = useResourcePermission('order', 'read');
const canUpdateOrders = useResourcePermission('order', 'update');
```

### Warehouse Management
```tsx
<PermissionGuard requireAdmin>
  <Button>Manage Warehouses</Button>
</PermissionGuard>
```

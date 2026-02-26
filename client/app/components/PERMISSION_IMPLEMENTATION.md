# Permission Implementation Guide

## Permission Matrix

| Module | Create | Read | Update | Delete | Admin Only |
|--------|--------|------|--------|--------|------------|
| Products | ✅ | ✅ | ✅ | ✅ | ❌ |
| Orders | ✅ | ✅ | ✅ | ✅ | ❌ |
| Warehouses | ❌ | ✅ | ✅ | ❌ | ✅ |
| Vendors | ❌ | ✅ | ✅ | ❌ | ✅ |
| Financial | ✅ | ✅ | ✅ | ✅ | ✅ |
| Categories | ✅ | ✅ | ✅ | ✅ | ❌ |
| Tags | ✅ | ✅ | ✅ | ✅ | ❌ |
| Units | ✅ | ✅ | ✅ | ✅ | ❌ |
| Import Orders | ✅ | ✅ | ✅ | ✅ | ❌ |
| Users/Roles | ❌ | ❌ | ❌ | ❌ | ✅ |

## Implementation Status

### ✅ Completed
- Login/Authentication system
- Permission hooks and guards
- Redis caching
- Vendor/Warehouse switcher

### 🔄 In Progress
- Adding permission checks to routes

### 📋 Route-by-Route Implementation

#### 1. Products (`/products`)
- **Permission Required**: R (Read) for list, C for add, U for edit, D for delete
- **Status**: Ready to implement

#### 2. Orders (`/orders`)
- **Permission Required**: R for list, C for create, U for update, D for delete
- **Status**: Ready to implement

#### 3. Warehouses (`/warehouses`)
- **Permission Required**: Admin for create/delete, R for list, U for update
- **Status**: Ready to implement

#### 4. Financial (`/financial`)
- **Permission Required**: Admin for all operations
- **Status**: Ready to implement

#### 5. Vendors (`/vendors`)
- **Permission Required**: Admin for create/delete, R for list, U for update
- **Status**: Ready to implement

## How to Add Permissions to Routes

### Step 1: Import Permission Guard
```tsx
import { PermissionGuard } from "~/components/permission-guard";
import { usePermission } from "~/hooks/use-permission";
```

### Step 2: Wrap Action Buttons
```tsx
<PermissionGuard permission="C" module="product">
  <TMButton component={Link} to="/products/add">
    Thêm
  </TMButton>
</PermissionGuard>
```

### Step 3: Protect Routes (Optional)
```tsx
export const loader = async ({ request }: LoaderFunctionArgs) => {
  await requirePermission(request, 'R', 'product');
  // ... rest of loader
};
```

### Step 4: Conditional Rendering
```tsx
const canCreate = usePermission('C', 'product');
const canDelete = usePermission('D', 'product');

return (
  <div>
    {canCreate && <Button>Add</Button>}
    {canDelete && <Button>Delete</Button>}
  </div>
);
```

## Testing Permissions

1. **Login as Admin**: Should have all permissions
2. **Login as Regular User**: Should have limited permissions
3. **Test Each Module**: Verify buttons show/hide correctly
4. **Test Direct URL Access**: Ensure routes are protected

## Notes

- Permissions are checked on both client and server side
- Admin role bypasses all permission checks
- Cache is invalidated on permission changes
- Failed permission checks are logged for debugging

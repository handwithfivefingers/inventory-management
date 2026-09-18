import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePermission, useResourcePermission, useIsAdmin } from "../use-permission";
import { usePermissionStore } from "~/store/permission.store";

describe("Permission Hooks", () => {
  const mockUser: any = {
    id: 1,
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    name: "Admin",
    isAdmin: true,
    permissions: [
      { id: 1, name: "product", method: "CREATE" },
      { id: 2, name: "product", method: "READ" },
      { id: 3, name: "order", method: "READ" },
    ],
  };

  const mockNonAdminUser: any = {
    ...mockUser,
    id: 2,
    name: "User",
    isAdmin: false,
    permissions: [{ id: 1, name: "product", method: "READ" }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    usePermissionStore.setState({ ...mockUser, updatePermissions: usePermissionStore.getState().updatePermissions });
  });

  describe("usePermission", () => {
    it("should return true when user has the required permission", () => {
      usePermissionStore.setState(mockUser as any);

      const { result } = renderHook(() => usePermission("CREATE", "product"));

      expect(result.current).toBe(true);
    });

    it("should return false when user lacks the required permission", () => {
      usePermissionStore.setState(mockNonAdminUser as any);

      const { result } = renderHook(() => usePermission("CREATE", "product"));

      expect(result.current).toBe(false);
    });

    it("should return false when user has no roles", () => {
      usePermissionStore.setState({ ...mockUser, isAdmin: false, permissions: [] } as any);

      const { result } = renderHook(() => usePermission("CREATE", "product"));

      expect(result.current).toBe(false);
    });

    it("should return false when user is undefined", () => {
      usePermissionStore.setState({ isAdmin: false, permissions: [] } as any);

      const { result } = renderHook(() => usePermission("CREATE", "product"));

      expect(result.current).toBe(false);
    });

    it("should check permission without module name", () => {
      usePermissionStore.setState(mockUser as any);

      const { result } = renderHook(() => usePermission("READ"));

      expect(result.current).toBe(true);
    });
  });

  describe("useResourcePermission", () => {
    it("should return true for create permission on product", () => {
      usePermissionStore.setState(mockUser as any);

      const { result } = renderHook(() => useResourcePermission("product", "create"));

      expect(result.current).toBe(true);
    });

    it("should return true for read permission on order", () => {
      usePermissionStore.setState(mockUser as any);

      const { result } = renderHook(() => useResourcePermission("order", "read"));

      expect(result.current).toBe(true);
    });

    it("should return false for delete permission on order", () => {
      usePermissionStore.setState(mockNonAdminUser as any);

      const { result } = renderHook(() => useResourcePermission("order", "delete"));

      expect(result.current).toBe(false);
    });

    it("should return false for update permission on warehouse", () => {
      usePermissionStore.setState(mockNonAdminUser as any);

      const { result } = renderHook(() => useResourcePermission("warehouse", "update"));

      expect(result.current).toBe(false);
    });
  });

  describe("useIsAdmin", () => {
    it("should return true when user has Admin role", () => {
      usePermissionStore.setState(mockUser as any);

      const { result } = renderHook(() => useIsAdmin());

      expect(result.current).toBe(true);
    });

    it("should return false when user does not have Admin role", () => {
      usePermissionStore.setState(mockNonAdminUser as any);

      const { result } = renderHook(() => useIsAdmin());

      expect(result.current).toBe(false);
    });

    it("should return false when user has no roles", () => {
      usePermissionStore.setState({ ...mockUser, isAdmin: false, permissions: [] } as any);

      const { result } = renderHook(() => useIsAdmin());

      expect(result.current).toBe(false);
    });

    it("should be case-insensitive for admin role", () => {
      const adminUser = { ...mockUser, isAdmin: true, name: "administrator", permissions: [] };
      usePermissionStore.setState(adminUser as any);
      const { result } = renderHook(() => useIsAdmin());
      expect(result.current).toBe(true);
    });
  });
});

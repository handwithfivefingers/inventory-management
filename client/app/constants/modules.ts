/**
 * Canonical permission module registry - mirrors
 * `backend-ts/src/constant/modules.ts`, which is enforced per-request by the
 * `authorize(module)` middleware.
 *
 * Keep both lists in sync: the module `key` is stored in `permissions.name`
 * and must match exactly (no fuzzy matching anywhere).
 */
export type PermissionAction = "C" | "R" | "U" | "D";

export interface IModule {
  key: string;
  label: string;
  description?: string;
}

export const PERMISSION_ACTIONS: { code: PermissionAction; label: string }[] = [
  { code: "C", label: "Thêm" },
  { code: "R", label: "Xem" },
  { code: "U", label: "Sửa" },
  { code: "D", label: "Xóa" },
];

export const MODULES: IModule[] = [
  { key: "dashboard", label: "Thống kê", description: "Dashboard & thống kê doanh thu" },
  { key: "order", label: "Đơn hàng", description: "Đơn bán hàng" },
  { key: "product", label: "Sản phẩm", description: "Sản phẩm, biến thể & thuộc tính" },
  { key: "customer", label: "Khách hàng", description: "Quản lý khách hàng" },
  { key: "invoice", label: "Hóa đơn", description: "Hóa đơn" },
  { key: "provider", label: "Nhà cung cấp", description: "Nhà cung cấp" },
  { key: "import-order", label: "Nhập hàng", description: "Đơn nhập hàng" },
  { key: "warehouse", label: "Kho bãi", description: "Quản lý kho" },
  { key: "category", label: "Danh mục", description: "Danh mục sản phẩm" },
  { key: "unit", label: "Đơn vị tính", description: "Đơn vị tính" },
  { key: "tag", label: "Thẻ", description: "Thẻ gắn sản phẩm" },
  { key: "financial", label: "Tài chính", description: "Sổ tài chính & báo cáo" },
  { key: "staff", label: "Nhân viên", description: "Quản lý nhân viên" },
  { key: "shift", label: "Chốt ca", description: "Mở/đóng ca làm việc" },
  { key: "setting", label: "Cài đặt", description: "Cấu hình cửa hàng" },
  { key: "role", label: "Vai trò", description: "Vai trò & phân quyền" },
];

// export const MODULES_BY_KEY = new Map(MODULES.map((m) => [m.key, m]));
export enum MODULE_ENUM {
  dashboard = "dashboard",
  order = "order",
  product = "product",
  customer = "customer",
  invoice = "invoice",
  provider = "provider",
  importOrder = "import-order",
  warehouse = "warehouse",
  category = "category",
  unit = "unit",
  tag = "tag",
  financial = "financial",
  staff = "staff",
  shift = "shift",
  setting = "setting",
  role = "role",
}

export interface IDashboardSeriesPoint {
  date: string;
  label: string;
  revenue: number;
  orders: number;
}

export interface IDashboardTopProduct {
  productId: number;
  productName?: string;
  productCode?: string;
  quantitySold: number;
  revenue: number;
}

export interface IDashboardLowStockItem {
  id: number;
  quantity: number;
  variantId?: number | null;
  product?: { id: number; name?: string; code?: string };
  warehouse?: { id: number; name?: string };
}

export type DashboardGranularity = "day" | "week" | "month";

export interface IDashboardStats {
  range: { days: number; from: string; to?: string; granularity?: DashboardGranularity };
  series: IDashboardSeriesPoint[];
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  topProducts: IDashboardTopProduct[];
  lowStock: IDashboardLowStockItem[];
  lowStockCount: number;
}

export interface IDashboardQueryParams {
  cookie?: string;
  vendorId?: string | number;
  days?: string | number;
  /** "YYYY-MM-DD"; overrides `days` when provided with `to`. */
  from?: string;
  /** "YYYY-MM-DD"; overrides `days` when provided with `from`. */
  to?: string;
  /** Force series grouping granularity; defaults to auto based on range span. */
  groupBy?: string;
  warehouseId?: string;
  lowStockThreshold?: string | number;
}

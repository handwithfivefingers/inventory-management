import { BaseQueryParams } from "./common";

export interface IFinancialRecord {
  id: number;
  code: string;
  type: "revenue" | "expense";
  category: string;
  amount: number;
  note?: string;
  relatedType?: string;
  relatedId?: number;
  staffId?: number;
  warehouseId?: number;
  transactionDate: string;
  createdAt?: string;
  staff?: any;
  warehouse?: any;
}

export interface IFinancialReport {
  revenue: number;
  importCost: number;
  otherExpense: number;
  totalExpense: number;
  netProfit: number;
  vatCollected: number;
}

export interface IFinancialQueryParams extends BaseQueryParams {
  warehouseId?: string;
  type?: string;
  category?: string;
  from?: string;
  to?: string;
}

import type {
  IAdminSearchItem,
  IPosSearchItem,
  IProductSearchRow,
  IUnifiedSearchResponse,
  ProductSearchContext,
} from "~/types/product";

/**
 * Adapters between the backend unified search (`POST /products/search`) and
 * the existing `IProduct`-shaped UI (shared `OrderForm`, admin table).
 * Pure functions — no Remix / store dependencies so they stay unit-testable.
 */

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

export const isPosSearchItem = (value: unknown): value is IPosSearchItem =>
  isRecord(value) && typeof (value as any).variant_id === "number";

export const isAdminSearchItem = (value: unknown): value is IAdminSearchItem =>
  isRecord(value) && typeof (value as any).product_id === "number" && typeof (value as any).variant_id !== "number";

export const isUnifiedSearchResponse = (value: unknown): value is IUnifiedSearchResponse => {
  if (!isRecord(value)) return false;
  if (typeof (value as any).exact_match !== "boolean") return false;
  if ((value as any).exact_match) return isPosSearchItem((value as any).data);
  return Array.isArray((value as any).data);
};

/** A POS hit is directly actionable: one row carrying its variant (no picker needed). */
export const mapPosItemToRow = (item: IPosSearchItem): IProductSearchRow => {
  const variant = {
    id: item.variant_id,
    productId: item.product_id,
    code: item.barcode,
    skuCode: item.sku,
    salePrice: item.price,
    regularPrice: item.price,
    quantity: item.stock_quantity,
  };
  return {
    id: item.product_id,
    documentId: `pos-${item.product_id}-${item.variant_id}`,
    code: item.barcode ?? "",
    createdAt: "",
    description: "",
    expiredAt: "",
    inventories: [],
    name: item.display_name,
    publishedAt: "",
    skuCode: item.sku,
    updatedAt: "",
    quantity: item.stock_quantity,
    salePrice: item.price,
    regularPrice: item.price,
    variantCount: 0,
    variants: [variant],
    unifiedVariant: variant,
  } as IProductSearchRow;
};

/** An ADMIN aggregate maps to a product row; price/sku fall back (see `unifiedAdmin`). */
export const mapAdminItemToRow = (item: IAdminSearchItem): IProductSearchRow => {
  return {
    id: item.product_id,
    documentId: `admin-${item.product_id}`,
    code: "",
    createdAt: "",
    description: "",
    expiredAt: "",
    inventories: [],
    name: item.product_name,
    publishedAt: "",
    skuCode: "",
    updatedAt: "",
    quantity: item.total_stock,
    salePrice: 0,
    regularPrice: 0,
    variantCount: item.total_variants,
    unifiedAdmin: true,
  } as IProductSearchRow;
};

export interface ParsedUnifiedSearch {
  context?: ProductSearchContext;
  exactItem?: IPosSearchItem;
  rows: IProductSearchRow[];
  totalCount: number;
}

/**
 * Normalize a raw fetcher payload (`fetcher.data.data`) into render-ready
 * rows. Unknown shapes degrade to an empty result instead of throwing.
 */
export const parseUnifiedSearchResponse = (payload: unknown): ParsedUnifiedSearch => {
  if (!isUnifiedSearchResponse(payload)) return { rows: [], totalCount: 0 };
  if (payload.exact_match) {
    return { context: payload.context, exactItem: payload.data, rows: [], totalCount: 1 };
  }
  const rows = payload.data.map((item) =>
    isPosSearchItem(item) ? mapPosItemToRow(item) : mapAdminItemToRow(item as IAdminSearchItem),
  );
  return { context: payload.context, rows, totalCount: Number(payload.total_count ?? rows.length) || 0 };
};

export interface UnifiedFormParams {
  query?: string | null;
  context: ProductSearchContext;
  warehouseId?: string | number | null;
  page?: string | number | null;
  limit?: string | number | null;
}

/** fetcher-submit-ready params: string values only, blanks omitted. */
export const buildUnifiedFormParams = ({ query, context, page, limit }: UnifiedFormParams): Record<string, string> => {
  const params: Record<string, string> = { context };
  if (query !== undefined && query !== null && String(query).trim() !== "") params.query = String(query);
  if (page !== undefined && page !== null && String(page).trim() !== "") params.page = String(page);
  if (limit !== undefined && limit !== null && String(limit).trim() !== "") params.limit = String(limit);
  return params;
};

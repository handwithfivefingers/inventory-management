import { useEffect, useMemo, useRef } from "react";
import { useFetcher } from "@remix-run/react";
import { buildUnifiedFormParams, parseUnifiedSearchResponse } from "~/libs/product-search";
import { useUser } from "~/store/user.store";
import type { IPosSearchItem, IProductSearchRow, ProductSearchContext } from "~/types/product";

export interface UnifiedSearchOptions {
  context: ProductSearchContext;
  /** Shared fetcher key so pages keep the existing "Products-Search" channel. */
  fetcherKey?: string;
  pageSize?: number;
  /** POS: auto-add the scanned item to cart. ADMIN: open/highlight the product. */
  onExactMatch?: (item: IPosSearchItem) => void;
}

export interface UnifiedSearch {
  rows: IProductSearchRow[];
  exactItem?: IPosSearchItem;
  totalCount: number;
  loading: boolean;
  /** True once a unified response has arrived (even an empty one). */
  active: boolean;
  search: (query: string, opts?: { page?: number | string; limit?: number | string }) => void;
}

/**
 * Client counterpart of backend `POST /products/search`.
 * Every search carries `context` (POS|ADMIN); POS searches additionally send
 * the active warehouse so stock stays real-time per warehouse.
 */
export const useUnifiedProductSearch = ({
  context,
  fetcherKey = "Products-Search",
  pageSize = 20,
  onExactMatch,
}: UnifiedSearchOptions): UnifiedSearch => {
  const fetcher = useFetcher<{ data: unknown }>({ key: fetcherKey });
  const activeWarehouse = useUser((s) => s.activeWarehouse);
  const exactSeenRef = useRef<IPosSearchItem | undefined>(undefined);

  const parsed = useMemo(() => parseUnifiedSearchResponse((fetcher.data as any)?.data), [fetcher.data]);

  useEffect(() => {
    if (parsed.exactItem && parsed.exactItem !== exactSeenRef.current) {
      exactSeenRef.current = parsed.exactItem;
      onExactMatch?.(parsed.exactItem);
    }
  }, [parsed.exactItem, onExactMatch]);

  const search = (query: string, opts?: { page?: number | string; limit?: number | string }) => {
    fetcher.submit(
      {
        ...buildUnifiedFormParams({
          query,
          context,
          // warehouseId: (activeWarehouse as any)?.id ?? undefined,
          page: opts?.page ?? 1,
          limit: opts?.limit ?? pageSize,
        }),
        intent: "search",
      },
      { method: "POST", action: "/products" },
    );
  };

  return {
    rows: parsed.rows,
    exactItem: parsed.exactItem,
    totalCount: parsed.totalCount,
    loading: fetcher.state !== "idle",
    active: fetcher.data !== undefined,
    search,
  };
};

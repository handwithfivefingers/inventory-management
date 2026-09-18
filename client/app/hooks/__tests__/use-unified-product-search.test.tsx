import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUnifiedProductSearch } from "../use-unified-product-search";

const submit = vi.fn();

vi.mock("@remix-run/react", () => ({
  useFetcher: vi.fn(),
}));

vi.mock("~/store/user.store", () => ({
  useUser: vi.fn(),
}));

import { useFetcher } from "@remix-run/react";
import { useUser } from "~/store/user.store";

const posExactPayload = {
  data: {
    exact_match: true,
    context: "POS",
    data: {
      variant_id: 11,
      product_id: 5,
      product_name: "Ao thun",
      variant_name: "ABC-123",
      display_name: "Ao thun - ABC-123",
      sku: "ABC-123",
      barcode: "BARCODE-001",
      price: 150,
      stock_quantity: 8,
    },
  },
};

describe("useUnifiedProductSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFetcher).mockReturnValue({ submit, state: "idle", data: undefined } as any);
    vi.mocked(useUser).mockImplementation((selector: any) => selector({ activeWarehouse: { id: 7 } }));
  });

  it("submits POS searches with context and the active warehouse", () => {
    const { result } = renderHook(() => useUnifiedProductSearch({ context: "POS" }));
    act(() => {
      result.current.search("abc");
    });
    expect(submit).toHaveBeenCalledWith(
      { context: "POS", intent: "search", query: "abc", warehouse_id: "7", page: "1", limit: "20" },
      { method: "POST", action: "/products" },
    );
  });

  it("submits ADMIN searches without a warehouse filter", () => {
    vi.mocked(useUser).mockImplementation((selector: any) => selector({ activeWarehouse: undefined }));
    const { result } = renderHook(() => useUnifiedProductSearch({ context: "ADMIN", pageSize: 10 }));

    act(() => {
      result.current.search("ao", { page: 2 });
    });

    expect(submit).toHaveBeenCalledWith(
      { context: "ADMIN", intent: "search", query: "ao", page: "2", limit: "10" },
      { method: "POST", action: "/products" },
    );
  });

  it("fires onExactMatch once per exact scan response", () => {
    const onExactMatch = vi.fn();
    vi.mocked(useFetcher).mockReturnValue({ submit, state: "idle", data: posExactPayload } as any);

    const { rerender } = renderHook(() => useUnifiedProductSearch({ context: "POS", onExactMatch }));
    expect(onExactMatch).toHaveBeenCalledTimes(1);
    expect(onExactMatch).toHaveBeenCalledWith(expect.objectContaining({ variant_id: 11, sku: "ABC-123" }));

    rerender();
    expect(onExactMatch).toHaveBeenCalledTimes(1);
  });

  it("exposes fallback rows and totalCount", () => {
    vi.mocked(useFetcher).mockReturnValue({
      submit,
      state: "loading",
      data: {
        data: {
          exact_match: false,
          context: "POS",
          data: [
            {
              variant_id: 11,
              product_id: 5,
              product_name: "Ao thun",
              variant_name: "ABC-123",
              display_name: "Ao thun - ABC-123",
              sku: "ABC-123",
              barcode: null,
              price: 150,
              stock_quantity: 8,
            },
          ],
          total_count: 1,
          page: 1,
          limit: 20,
        },
      },
    } as any);

    const { result } = renderHook(() => useUnifiedProductSearch({ context: "POS" }));
    expect(result.current.loading).toBe(true);
    expect(result.current.active).toBe(true);
    expect(result.current.totalCount).toBe(1);
    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0].unifiedVariant).toMatchObject({ id: 11 });
  });

  it("reports inactive before the first response", () => {
    const { result } = renderHook(() => useUnifiedProductSearch({ context: "ADMIN" }));
    expect(result.current.active).toBe(false);
    expect(result.current.rows).toHaveLength(0);
  });
});

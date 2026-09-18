import { ActionFunctionArgs, json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { Link, useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { useMemo, useRef, useState } from "react";
import { namedAction } from "remix-utils/named-action";
import { productService } from "~/action.server/products.service";
import { BarcodePrintModal } from "~/components/barcode-print-modal";
import { IBarcodeLabel } from "~/components/barcode-print-sheet";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { CheckboxInput } from "~/components/form/checkbox-input";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { CreateFab } from "~/components/layouts/create-fab";
import { toast } from "~/components/notification";
import { PermissionGuard } from "~/components/permission-guard";
import { ProductImportModal } from "~/components/product-import-modal";
import { TMButton } from "~/components/tm-button";
import { TMPagination } from "~/components/tm-pagination";
import { TMTable } from "~/components/tm-table";
import { MODULE_ENUM } from "~/constants/modules";
import { useSubmitPromise } from "~/hooks";
import { useUnifiedProductSearch } from "~/hooks/use-unified-product-search";
import { useTranslation } from "~/i18n";
import { dayjs } from "~/libs/date";
import { debounce } from "~/libs/debounce";
import { getProductPriceLabel, mapProductListRow } from "~/libs/product-price";
import { IProduct, IProductSearchRow } from "~/types/product";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const params = url.searchParams;
  const page = params.get("page") || "1";
  const pageSize = params.get("pageSize") || "10";
  const s = params.get("s") || "";
  const resp = await productService.getProducts({
    page,
    pageSize,
    s,
  });
  return {
    data: resp.data?.data?.map(mapProductListRow),
    total: resp.data?.total,
    s,
    page,
    pageSize,
  };
}

export const meta: MetaFunction = () => {
  return [{ title: "Sản phẩm" }, { name: "description", content: "Quản lý sản phẩm" }];
};

export default function Products() {
  const navigate = useNavigate();
  const { data, total: currentTotal, page: defaultPage, pageSize: defaultPageSize, s } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const fetcher = useFetcher<{
    data: IProduct[];
    total: number;
    page: string;
    pageSize: string;
    s: string;
  }>();
  const isLoading = fetcher.state === "submitting" || fetcher.state === "loading";
  const { submit: deleteProduct, isLoading: isDeleting } = useSubmitPromise();

  // ---------- Excel export ----------
  const exportRef = useRef<HTMLAnchorElement>(null);
  const [exporting, setExporting] = useState(false);

  // ---------- Barcode print selection ----------
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  // Unified ADMIN search: exact barcode/SKU scans jump to the product,
  // otherwise aggregate rows (total variants/stock + total_count) render below.
  const [unifiedQuery, setUnifiedQuery] = useState("");
  const [unifiedPage, setUnifiedPage] = useState(1);
  const {
    rows: unifiedRows,
    totalCount: unifiedTotal,
    loading: unifiedLoading,
    active: unifiedActive,
    search: searchUnified,
  } = useUnifiedProductSearch({
    context: "ADMIN",
    onExactMatch: (item) => {
      toast.success({ title: t("common.success"), message: item.display_name });
      navigate(`./${item.product_id}`);
    },
  });
  const searchingUnified = unifiedActive && unifiedQuery.trim() !== "";
  const products = searchingUnified ? unifiedRows : fetcher.data?.data?.map(mapProductListRow) || data || [];
  const total = searchingUnified ? unifiedTotal : fetcher.data?.total || currentTotal || 0;
  const query = fetcher?.data?.s || s || "";
  const pageSize = Number(fetcher?.data?.pageSize || defaultPageSize || 10);
  const page = Number(fetcher?.data?.page || defaultPage || 1);

  const toggleSelect = (id: string | number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm(t("common.confirmDelete"))) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    await deleteProduct({ intent: "delete", id: String(id) }, { method: "POST" });
    // The route loader revalidates after the action; when a search filter is
    // active the visible list comes from the search fetcher, so reload it.
    if (fetcher.data) {
      fetcher.load(
        `/products?${new URLSearchParams({
          s: query,
          page: "1",
          pageSize: String(pageSize),
        }).toString()}`,
      );
    }
  };

  const barcodeLabels: IBarcodeLabel[] = useMemo(
    () =>
      products
        .filter((p) => selectedIds.has(p.id))
        .map((p) => ({
          id: p.id,
          name: p.name,
          skuCode: p.skuCode || p.code,
          price: p.priceFrom ?? p.salePrice ?? p.regularPrice ?? p.costPrice,
        })),
    [products, selectedIds],
  );

  const handleExport = async () => {
    setExporting(true);
    try {
      const qs = new URLSearchParams({ s: query });
      const resp = await fetch(`/api/products/export?${qs.toString()}`, { credentials: "include" });
      if (!resp.ok) throw new Error(await resp.text());
      const blob = await resp.blob();
      const disposition = resp.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?(.+?)"?$/);
      const filename = match?.[1] || `products-${dayjs().format("YYYYMMDD-HHmm")}.xlsx`;
      const url = URL.createObjectURL(blob);
      if (exportRef.current) {
        exportRef.current.href = url;
        exportRef.current.download = filename;
        exportRef.current.click();
      }
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.danger({ title: "Lỗi", message: error?.message || "Xuất Excel thất bại" });
    } finally {
      setExporting(false);
    }
  };
  return (
    <div className=" w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <PermissionGuard permission="CREATE" module={MODULE_ENUM.product}>
        <CreateFab to="./add" label={t("common.add")} />
      </PermissionGuard>
      {/* Hidden anchor used by the Excel export blob download */}
      <a ref={exportRef} className="hidden" aria-hidden />
      <CardItem
        title={
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                <Icon name="package" fontSize={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">
                  {t("sidebar.products")}
                </h2>
              </div>
            </div>
          </div>
        }
        action={
          <div className="ml-auto block my-auto">
            <div className="flex gap-2 flex-wrap flex-row">
              <PermissionGuard permission="CREATE" module={MODULE_ENUM.product}>
                <TMButton component={Link} to={"./add"} size="sm" className="hidden sm:inline-flex">
                  <Icon name="plus" fontSize={16} />
                  <span>{t("common.add")}</span>
                </TMButton>
              </PermissionGuard>
              <PermissionGuard permission="READ" module={MODULE_ENUM.product}>
                <TMButton size="sm" onClick={() => setShowImportModal(true)} className="hidden sm:inline-flex">
                  <Icon name="file-plus" fontSize={16} />
                  <span className="hidden sm:inline">{t("common.importExcel")}</span>
                </TMButton>
              </PermissionGuard>
              <PermissionGuard permission="READ" module={MODULE_ENUM.product}>
                <TMButton size="sm" onClick={handleExport} loading={exporting} className="hidden sm:inline-flex">
                  <Icon name="file-text" fontSize={16} />
                  <span className="hidden sm:inline">{t("common.exportExcel")}</span>
                </TMButton>
              </PermissionGuard>
              <PermissionGuard permission="READ" module={MODULE_ENUM.product}>
                <TMButton
                  size="sm"
                  disabled={barcodeLabels.length === 0}
                  onClick={() => setShowBarcodeModal(true)}
                  title={barcodeLabels.length === 0 ? "Chọn sản phẩm để in mã vạch" : undefined}
                  className="hidden sm:inline-flex"
                >
                  <Icon name="bar-chart-2" fontSize={16} />
                  <span className="hidden sm:inline">
                    {t("common.printBarcode")}
                    {barcodeLabels.length > 0 ? ` (${barcodeLabels.length})` : ""}
                  </span>
                </TMButton>
              </PermissionGuard>
            </div>
          </div>
        }
        className="flex flex-col w-full rounded-md bg-white shadow-2xl shadow-slate-200 gap-2 dark:bg-slate-800 dark:shadow-black/20 p-5 sm:p-6 h-full"
      >
        <div className="flex gap-2 flex-col h-full overflow-hidden">
          <div className="flex gap-2 shrink-0">
            <TextInput
              placeholder="Lọc theo mã, tên hàng hóa"
              defaultValue={query}
              onChange={debounce((v) => {
                const value = v.target.value;
                if (value.trim() !== "") {
                  setUnifiedQuery(value);
                  setUnifiedPage(1);
                  searchUnified(value, { page: 1, limit: pageSize });
                  return;
                }
                setUnifiedQuery("");
                const url = `/products?${new URLSearchParams({
                  s: value,
                  page: "1",
                  pageSize: String(pageSize),
                }).toString()}`;
                fetcher.load(
                  `/products?${new URLSearchParams({
                    s: value,
                    page: "1",
                    pageSize: String(pageSize),
                  }).toString()}`,
                );
                // navigate(url);
              }, 500)}
            />
          </div>
          <div className="flex-1 overflow-auto">
            <TMTable
              loading={isLoading || isDeleting || unifiedLoading}
              scrollable
              columns={[
                {
                  title: (
                    <CheckboxInput
                      label=""
                      checked={products.length > 0 && products.every((p) => selectedIds.has(p.id))}
                      onChange={(e: any) => {
                        const checked = e.target.checked;
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          for (const p of products) {
                            if (checked) next.add(p.id);
                            else next.delete(p.id);
                          }
                          return next;
                        });
                      }}
                    />
                  ),
                  dataIndex: "select",
                  width: 50,
                  render: (record) => (
                    <CheckboxInput
                      label=""
                      checked={selectedIds.has(record.id)}
                      onClick={(e: any) => e.stopPropagation()}
                      onChange={(e: any) => toggleSelect(record.id, e.target.checked)}
                    />
                  ),
                },
                {
                  title: "Tên sản phẩm",
                  dataIndex: "name",
                  render: (record) => record["name"],
                },
                {
                  title: "Mã sản phẩm",
                  dataIndex: "skuCode",
                  hideOnMobile: true,
                  render: (record) =>
                    (record as IProductSearchRow).unifiedAdmin ? "—" : record["skuCode"] || record["code"],
                },
                {
                  title: "Giá bán",
                  dataIndex: "salePrice",
                  render: (record) => getProductPriceLabel(record as IProduct),
                },
                {
                  title: "Tồn kho",
                  dataIndex: "quantity",
                  render: (record) => Number(record["quantity"]) || 0,
                },
                {
                  title: "Biến thể",
                  dataIndex: "variantCount",
                  hideOnMobile: true,
                  render: (record) =>
                    Number(record.type) === 1 ? (
                      <span className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-full px-2 py-0.5 text-xs">
                        {record.type} biến thể
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>
                    ),
                },
                {
                  title: "Đã bán",
                  dataIndex: "sold",
                  hideOnMobile: true,
                  render: (record) => record["sold"] || 0,
                },
                {
                  title: "Ngày tạo",
                  dataIndex: "createdAt",
                  hideOnMobile: true,
                  render: (record) => dayjs(record.createdAt).format("DD/MM/YYYY"),
                },
                {
                  title: t("common.actions"),
                  dataIndex: "actions",
                  width: 70,
                  render: (record) => (
                    <div className="flex gap-1" onClick={(e: any) => e.stopPropagation()}>
                      <PermissionGuard permission="DELETE" module={MODULE_ENUM.product}>
                        <TMButton
                          size="sm"
                          onClick={(e: any) => {
                            e.stopPropagation();
                            handleDelete(record.id);
                          }}
                          className="py-2 text-red-500 bg-red-500/20"
                          title={t("common.delete")}
                        >
                          <Icon name="trash-2" fontSize={12} />
                        </TMButton>
                      </PermissionGuard>
                    </div>
                  ),
                },
              ]}
              data={products || []}
              rowKey={"id"}
              onRow={{
                onClick: (record) => navigate(`./${record?.id}`),
              }}
            />
          </div>
          <div className="flex gap-2 shrink-0 overflow-x-auto max-w-full">
            <TMPagination
              total={total || 0}
              current={searchingUnified ? unifiedPage : page}
              pageSize={pageSize}
              onPageChange={(page: number) => {
                if (searchingUnified) {
                  setUnifiedPage(page);
                  searchUnified(unifiedQuery, { page, limit: pageSize });
                  return;
                }
                navigate(`?page=${page}&pageSize=${pageSize}&s=${s}`);
              }}
            />
          </div>
        </div>
      </CardItem>
      <BarcodePrintModal show={showBarcodeModal} close={() => setShowBarcodeModal(false)} labels={barcodeLabels} />
      <ProductImportModal show={showImportModal} close={() => setShowImportModal(false)} />
    </div>
  );
}
export async function action({ request }: ActionFunctionArgs) {
  // return withContext(request, async () => {
  const form = await request.formData();
  // Soft-delete a product (backend uses paranoid delete, so orders / stock /
  // finance history that references the product is preserved).

  return namedAction(form, {
    delete: async () => {
      const id = form.get("id");
      if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
      try {
        await productService.deleteProduct(String(id));
        return Response.json({ success: true });
      } catch (error: any) {
        return Response.json({ error: error?.message || "Delete failed" }, { status: 400 });
      }
    },
    search: async () => {
      const variantOf = form.get("variantOf");
      if (variantOf) {
        return Response.json(await productService.getProductVariants({ id: variantOf as string }));
      }
      // Unified search (POS/Sell + Admin): POST /products with context=POS|ADMIN.
      // Exact barcode/SKU scans return { exact_match: true }; otherwise POS gets
      // variant-level rows and ADMIN gets product aggregates with total_count.
      const context = String(form.get("context") ?? "")
        .trim()
        .toUpperCase();

      if (context === "POS" || context === "ADMIN") {
        const query = String(form.get("query") ?? form.get("s") ?? "");
        return Response.json(
          await productService.searchProducts({
            query,
            context: context as "POS" | "ADMIN",
            page: String(form.get("page") ?? "1"),
            limit: String(form.get("limit") ?? form.get("pageSize") ?? "20"),
          }),
        );
      }
      const s = form.get("s") || "";
      return Response.json(await productService.getProducts({ s: s as string, page: "1", pageSize: "10" }));
    },
  });

  if (form.get("intent") === "delete") {
    const id = form.get("id");
    if (!id) return json({ error: "Missing id" }, { status: 400 });
    try {
      await productService.deleteProduct(String(id));
      return json({ success: true });
    } catch (error: any) {
      return json({ error: error?.message || "Delete failed" }, { status: 400 });
    }
  }
  // Variant listing for the order flow: POST /products with variantOf=<productId>
}

export function ErrorBoundary() {
  return <ErrorComponent />;
}

// Bạn là một Chuyên gia Kiến trúc Phần mềm (Software Architect) và Chuyên gia CSDL (Database Expert).
// Tôi cần bạn lập kế hoạch và viết các script/code cụ thể để thực hiện Migration hệ thống Quản lý Sản phẩm (Catalog) từ mô hình cũ sang mô hình mới có hỗ trợ Biến thể (Product & Product Variant) và Barcode.

// ---
// ### 1. BỐI CẢNH VÀ HIỆN TRẠNG (CONTEXT)
// - **Hệ thống hiện tại (Legacy):**
//   - Đang lưu tất cả sản phẩm ở bảng `products` và `productVariants`.
//   - Hệ thông đang có nhiều đơn hàng trong bảng `orders`, `orderDetails`,`invoices`, `invoiceDetails`
//   - FE đang lấy dữ liệu ở cả 2 bảng `products` và `productVariants`.
// - **Mục tiêu Migration:**
//   1. Chuyển đổi mô hình dữ liệu sang 2 bảng: `products` (thông tin chung) và `product_variants` (chứa SKU, Barcode, Giá, Tồn kho, ...).
//   2. Thêm column `sold` ở bảng `product_variants`
//   3. Toàn bộ Sản phẩm hiện tại (Simple Product) sẽ được migrate thành 1 Product + 1 Variant mặc định (Default Variant).
//   4. Tất cả Barcode hiện tại ở bảng cũ phải chuyển sang bảng `product_variants` mới và đảm bảo tính Duy nhất theo vendorId.
//   5. Cập nhật khóa ngoại (Foreign Key) ở bảng `order_items` để trỏ chính xác về `variant_id` mới tạo mà KHÔNG làm đứt gãy lịch sử đơn hàng.
//   6. Cập nhật method tạo/cập nhật `order` `orderdetails` cần cập nhật chỉ số `sold` cho `productvariant` và `product`.
//   7. Client cần xem xét mapping lại data nếu có thay đổi

// ---
// ### 2. YÊU CẦU ĐẦU RA (OUTPUT DELIVERABLES)

// Hãy cung cấp giải pháp chi tiết theo 5 phần sau:

// #### PHẦN 1: DDL SCRIPTS (Cấu trúc CSDL mới)
// - Viết các câu lệnh SQL DDL để tạo bảng `products`, `product_variants` (và bảng `variant_barcodes` nếu cần).
// - Đảm bảo có đầy đủ Data Types, Foreign Keys, Unique Indexes, Default values, Soft-delete (`deleted_at` hoặc `status`), và Timestamp.

// #### PHẦN 2: DATA MIGRATION SCRIPT (SQL/Code ETL)
// - Viết script chuyển đổi dữ liệu cũ sang mới (Data ETL):
//   + Bước 1: Migrate dữ liệu từ `products` cũ sang `products` mới và `product_variants` mới.
//   + Bước 2: Map lại `variant_id` mới tạo vào các bảng lịch sử như `order_items`, `inventory_logs` (xử lý snapshot dữ liệu: name, sku, barcode, price tại thời điểm bán).
// - Viết script dạng Idempotent (có thể chạy lại nhiều lần không bị trùng lặp dữ liệu - ví dụ dùng `ON CONFLICT` hoặc `INSERT INTO ... SELECT`).
// - Xử lý các edge case: Barcode bị null, Barcode cũ bị trùng lặp trong DB hiện tại, Tên sản phẩm bị trùng.

// #### PHẦN 3: BUSINESS & ORM LAYER (Code ứng dụng)
// - Viết các đoạn Code/Model mẫu trên:
//   + Khai báo Quan hệ (Relationship) giữa Product và Variant.
//   + Logic Validation khi tạo/sửa Barcode (Khóa sửa Barcode khi Variant đã có trong `order_items`).
//   + Logic Quét mã Barcode (Scan) để tìm Variant tương ứng.

// #### PHẦN 4: CHIẾN LƯỢC DEPLOYMENT & ROLLBACK (Phát hành an toàn)
// - Chi tiết các bước thực hiện theo quy trình **Expand-Contract Pattern (Parallel Run)**:
//   1. Expand: Thêm bảng mới, chạy đồng bộ song song.
//   2. Migrate: Chuyển dữ liệu cũ sang.
//   3. Switch: Chuyển App sang dùng schema mới.
//   4. Contract: Dọn dẹp schema cũ.
// - Script Rollback khẩn cấp nếu việc migration gặp sự cố giữa chừng.

// #### PHẦN 5: CHECKLIST KIỂM THỬ (Verification)
// - Danh sách các câu lệnh SQL Query để Kiểm tra (Audit) tính toàn vẹn dữ liệu sau khi Migration xong (Ví dụ: So sánh tổng số lượng sản phẩm cũ vs mới, kiểm tra record bị mồ côi FK, kiểm tra trùng barcode).

// ---
// Hãy trình bày rõ ràng, chi tiết, kèm comment giải thích cụ thể trong từng đoạn code/SQL.

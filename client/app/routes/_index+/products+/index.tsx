import { ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { Link, useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { useMemo, useRef, useState } from "react";
import { productService } from "~/action.server/products.service";
import { BarcodePrintModal } from "~/components/barcode-print-modal";
import { IBarcodeLabel } from "~/components/barcode-print-sheet";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { CheckboxInput } from "~/components/form/checkbox-input";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { ProductImportModal } from "~/components/product-import-modal";
import { PermissionGuard } from "~/components/permission-guard";
import { toast } from "~/components/notification";
import { CreateFab } from "~/components/layouts/create-fab";
import { TMButton } from "~/components/tm-button";
import { TMPagination } from "~/components/tm-pagination";
import { TMTable } from "~/components/tm-table";
import { MODULE_ENUM } from "~/constants/modules";
import { useTranslation } from "~/i18n";
import { dayjs } from "~/libs/date";
import { debounce } from "~/libs/debounce";
import { formatCurrency } from "~/libs/format-currency";
import { IProduct } from "~/types/product";
import { withContext } from "~/action.server/context.server";

export async function loader({ request }: LoaderFunctionArgs) {
  return withContext(request, async () => {
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
      data: resp.data?.data,
      total: resp.data?.total,
      s,
      page,
      pageSize,
    };
  });
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

  // ---------- Barcode print selection ----------
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const products = fetcher.data?.data || data || [];
  const total = fetcher.data?.total || currentTotal || 0;
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

  const barcodeLabels: IBarcodeLabel[] = useMemo(
    () =>
      products
        .filter((p) => selectedIds.has(p.id))
        .map((p) => ({ id: p.id, name: p.name, skuCode: p.skuCode || p.code, price: p.salePrice ?? p.regularPrice })),
    [products, selectedIds],
  );

  // ---------- Excel export ----------
  const exportRef = useRef<HTMLAnchorElement>(null);
  const [exporting, setExporting] = useState(false);
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

  console.log(`data`, data);
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
                fetcher.load(
                  `/products?${new URLSearchParams({
                    s: value,
                    page: "1",
                    pageSize: String(pageSize),
                  }).toString()}`,
                );
              }, 500)}
            />
          </div>
          <div className="flex gap-2 flex-col items-end animate__animated animate__faster animate__fadeIn flex-1 overflow-auto">
            <TMTable
              loading={isLoading}
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
                  render: (record) => record["skuCode"] || record["code"],
                },
                {
                  title: "Giá bán",
                  dataIndex: "salePrice",
                  render: (record) =>
                    formatCurrency(Number(record?.salePrice) > 0 ? record.salePrice : record.regularPrice ?? 0),
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
                    Number(record.variantCount) > 0 ? (
                      <span className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-full px-2 py-0.5 text-xs">
                        {record.variantCount} biến thể
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
              current={page}
              pageSize={pageSize}
              onPageChange={(page: number) => {
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
  // Variant listing for the order flow: POST /products with variantOf=<productId>
  const variantOf = form.get("variantOf");
  if (variantOf) {
    return productService.getProductVariants({ id: variantOf as string });
  }
  const s = form.get("s") || "";
  return productService.getProducts({ s: s as string, page: "1", pageSize: "10" });
  // });
}

export function ErrorBoundary() {
  return <ErrorComponent />;
}

// Role & Goal:

// Act as a Principal Software Engineer focused on code quality and clean architecture. Your task is to refactor the provided code by splitting large functions into smaller, single-purpose functions while following proper Controller-Service separation.

// Instructions & Guidelines:

// Controller Layer Responsibility:

// Controllers must strictly handle HTTP concerns: parse parameters, query strings, headers, and request bodies.

// Convert/map request inputs into clean Data Transfer Objects (DTOs) or plain data types, then pass them to the Service layer.

// Do not write business logic inside the controller.

// Service Layer Responsibility:

// Services must never accept HTTP Request objects (e.g., req, HttpServletRequest, Request).

// Service methods must accept pure data types or DTOs/Value Objects.

// Split large service methods into smaller, dedicated sub-functions where each function handles only one specific piece of business logic (Single Responsibility Principle).

// Clear & Readable Naming:

// Use self-explanatory, descriptive variable and function names (e.g., extractUserData, validateInventoryLevel, isUserEligible).

// Behavior Integrity:

// Preserve original functionality and output behavior completely.

// Summary of Changes:

// Provide a brief summary of how the logic was split and list the new functions created for Controller and Service layers.

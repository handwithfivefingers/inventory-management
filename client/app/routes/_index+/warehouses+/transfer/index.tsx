import { ActionFunctionArgs, json, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { useState } from "react";
import { productService } from "~/action.server/products.service";
import { transferService, warehouseService } from "~/action.server/warehouse.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { NumberInput } from "~/components/form/number-input";
import { SelectInput } from "~/components/form/select-input";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { toast } from "~/components/notification";
import { TMButton } from "~/components/tm-button";
import { TMTable } from "~/components/tm-table";
import { MODULE_ENUM } from "~/constants/modules";
import { PermissionGuard } from "~/components/permission-guard";
import { useTranslation } from "~/i18n";
import { parseCookieFromRequest } from "~/sessions";
import { IProduct } from "~/types/product";
import { IWareHouse } from "~/types/warehouse";
import { debounce } from "~/libs/debounce";
interface ITransferLine {
  key: string;
  productId: number;
  variantId?: number | null;
  name: string;
  skuCode?: string | null;
  maxStock: number;
  quantity: number;
}
export async function loader({ request, context }: LoaderFunctionArgs) {
  const resp = await warehouseService.getWareHouses({ page: "1", pageSize: "100" } as any);
  const warehouses = (resp.data?.data || []) as IWareHouse[];
  return {
    warehouses,
    currentWarehouseId: context.warehouseId,
  };
}

export const meta: MetaFunction = () => {
  return [{ title: "Chuyển kho" }, { name: "description", content: "Chuyển hàng giữa các kho" }];
};

export default function WarehouseTransfer() {
  const { warehouses, currentWarehouseId } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const fetcher = useFetcher<{ success?: boolean; error?: string }>({ key: "warehouse-transfer" });

  const [fromId, setFromId] = useState<number | undefined>(currentWarehouseId ?? warehouses[0]?.id);
  const [toId, setToId] = useState<number | undefined>(warehouses.find((w) => w.id !== fromId)?.id);
  const [lines, setLines] = useState<ITransferLine[]>([]);
  const [search, setSearch] = useState("");

  const searchFetcher = useFetcher<{ data: { data: IProduct[] } }>({ key: "Transfer-Product-Search" });
  const searchResults = searchFetcher.data?.data?.data || [];
  const warehouseOptions = warehouses.map((w) => ({ label: w.name, value: w.id as any }));

  const handleSearch = debounce((e: any) => {
    const value = e.target.value;
    setSearch(value);
    if (value.trim().length >= 2) {
      searchFetcher.submit({ s: value }, { method: "POST", action: "/products" });
    }
  }, 400);

  const addLine = (product: IProduct) => {
    const key = `p${product.id}`;
    setLines((prev) => {
      if (prev.some((l) => l.key === key)) return prev;
      return [
        ...prev,
        {
          key,
          productId: product.id,
          variantId: null,
          name: product.name,
          skuCode: product.skuCode || product.code,
          maxStock: Number(product.quantity) || 0,
          quantity: 1,
        },
      ];
    });
    setSearch("");
  };

  const updateQuantity = (key: string, value: number) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, quantity: Math.max(1, Number(value) || 1) } : l)));
  };

  const removeLine = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key));

  const canSubmit = fromId && toId && fromId !== toId && lines.length > 0 && fetcher.state === "idle";

  const onSubmit = () => {
    if (!canSubmit) return;
    fetcher.submit(
      {
        data: JSON.stringify({
          fromWarehouseId: fromId,
          toWarehouseId: toId,
          items: lines.map((l) => ({ productId: l.productId, variantId: l.variantId ?? null, quantity: l.quantity })),
        }),
      },
      { method: "POST" },
    );
  };

  if (fetcher.state === "idle" && fetcher.data?.success) {
    toast.success({ title: "Thành công", message: "Chuyển kho thành công" });
    navigate("/warehouses");
  }
  if (fetcher.state === "idle" && fetcher.data?.error) {
    toast.danger({ title: "Lỗi", message: fetcher.data.error });
  }

  return (
    <div className="w-full flex flex-col p-3 gap-3 overflow-auto h-full bg-slate-50/50 dark:bg-transparent">
      <div className="max-w-4xl w-full mx-auto flex flex-col gap-3">
        <CardItem
          title={
            <div className="flex gap-3">
              <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                <Icon name="repeat" fontSize={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">Chuyển kho</h2>
                <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                  Di chuyển hàng hóa giữa hai kho
                </p>
              </div>
            </div>
          }
          className="p-5 sm:p-6"
        >
          <div className="flex flex-col gap-4">
            {/* Warehouse pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectInput
                label="Từ kho"
                options={warehouseOptions}
                value={fromId as any}
                onSelect={(v: any) => setFromId(Number(v))}
              />
              <SelectInput
                label="Đến kho"
                options={warehouseOptions.filter((w) => Number(w.value) !== fromId)}
                value={toId as any}
                onSelect={(v: any) => setToId(Number(v))}
              />
            </div>
            {fromId && fromId === toId && <p className="text-sm text-red-500">Kho nguồn và kho đích phải khác nhau</p>}

            {/* Product search */}
            <div className="relative">
              <TextInput placeholder="Tìm sản phẩm để thêm (tên, mã SP, SKU)" value={search} onChange={handleSearch} />
              {search.trim().length >= 2 && searchResults.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded shadow-lg max-h-60 overflow-auto">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex justify-between gap-2 text-sm"
                      onClick={() => addLine(p)}
                    >
                      <span className="truncate">{p.name}</span>
                      <span className="text-slate-400 shrink-0">
                        {p.skuCode || p.code} · Tồn: {Number(p.quantity) || 0}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Lines */}
            <TMTable
              columns={[
                {
                  title: "Sản phẩm",
                  dataIndex: "name",
                  render: (r: ITransferLine) => (
                    <div className="flex flex-col">
                      <span>{r.name}</span>
                      {r.skuCode && <span className="text-xs text-slate-400">{r.skuCode}</span>}
                    </div>
                  ),
                },
                { title: "Tồn tại kho nguồn", dataIndex: "maxStock", render: (r: ITransferLine) => r.maxStock },
                {
                  title: "Số lượng",
                  dataIndex: "quantity",
                  width: 160,
                  render: (r: ITransferLine) => (
                    <NumberInput
                      value={`${r.quantity}`}
                      min={1}
                      onValueChange={(v: any) => updateQuantity(r.key, v.value)}
                    />
                  ),
                },
                {
                  title: "",
                  dataIndex: "remove",
                  width: 60,
                  render: (r: ITransferLine) => (
                    <TMButton variant="ghost" size="xs" onClick={() => removeLine(r.key)}>
                      <Icon name="trash-2" fontSize={14} />
                    </TMButton>
                  ),
                },
              ]}
              data={lines}
              rowKey="key"
            />
            {lines.length === 0 && (
              <p className="text-sm text-slate-400">Chưa có sản phẩm nào. Tìm và thêm sản phẩm ở trên.</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
              <TMButton variant="ghost" size="sm" component={Link} to="/warehouses">
                {t("common.cancel")}
              </TMButton>
              <PermissionGuard permission="UPDATE" module={MODULE_ENUM.warehouse} requireAdmin>
                <TMButton size="sm" disabled={!canSubmit} loading={fetcher.state !== "idle"} onClick={onSubmit}>
                  <Icon name="repeat" fontSize={16} />
                  Xác nhận chuyển kho
                </TMButton>
              </PermissionGuard>
            </div>
          </div>
        </CardItem>
      </div>
    </div>
  );
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const data = JSON.parse((formData.get("data") as string) || "{}");
    await transferService.createTransfer({
      fromWarehouseId: Number(data.fromWarehouseId),
      toWarehouseId: Number(data.toWarehouseId),
      note: data.note,
      items: data.items || [],
    });
    return Response.json({ success: true });
  } catch (error: any) {
    return Response.json({ success: false, error: error?.message || "Chuyển kho thất bại" }, { status: 400 });
  }
}

export function ErrorBoundary() {
  return <ErrorComponent />;
}

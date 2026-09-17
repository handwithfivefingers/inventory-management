import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigate, useSearchParams } from "@remix-run/react";
import React, { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { namedAction } from "remix-utils/named-action";
import { invoiceService } from "~/action.server/invoice.service";
import { orderService } from "~/action.server/order.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { OrderForm } from "~/components/form/order-form";
import { Icon } from "~/components/icon";
import { toast } from "~/components/notification";
import { printInvoiceViaBrowser, ReceiptPrinter } from "~/components/receipt-printer";
import { TMButton } from "~/components/tm-button";
import { OrderDetailSchema, OrderSchema, orderSchema } from "~/constants/schema/order";
import { useSubmitPromise } from "~/hooks";
import { useUnifiedProductSearch } from "~/hooks/use-unified-product-search";
import { useTranslation } from "~/i18n";
import { formatCurrency } from "~/libs/format-currency";
import { clampLineQty, defaultSelection, deriveInvoiceType, lineRemaining } from "~/libs/invoice-lines";
import { parseCookieFromRequest } from "~/sessions";
import { IInvoice } from "~/types/invoice";
import { IProduct, IProductSearchRow } from "~/types/product";

export const meta: MetaFunction = () => {
  return [{ title: "Chi tiết đơn hàng" }];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { id } = params;
  const { cookie, warehouseId, vendorId } = await parseCookieFromRequest(request);
  if (!id) throw new Error("Không tìm thấy đơn hàng");
  const response = await orderService.getOrderById({
    id,
  });
  const order = (response.data as any)?.data ?? response.data;
  // One order can have MANY invoices (partial deliveries) — load all so the
  // page can list them with one Print button per invoice (never Order-level).
  let invoices: any[] = [];
  try {
    const invResp: any = await invoiceService.getInvoices({
      orderId: id,
      page: "1",
      pageSize: "50",
    } as any);
    const rows = invResp?.data?.data ?? invResp?.data?.rows ?? [];
    invoices = Array.isArray(rows) ? rows : [];
  } catch (e) {
    console.warn("load invoices for order failed", e);
  }
  return { data: order, invoices };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();

  try {
    return namedAction(formData, {
      "create-invoice": async () => {
        const rawLines = formData.get("lines");
        let lines: any[] = [];
        try {
          lines = rawLines ? JSON.parse(String(rawLines)) : [];
        } catch {
          return Response.json({ error: "Invalid lines JSON" });
        }
        const resp: any = await orderService.createOrderInvoice({
          id: params.id as string,
          lines,
        });
        const created = (resp?.data as any)?.data ?? resp?.data;
        return Response.json({ invoiceId: created?.id ?? null, invoice: created ?? null });
      },
      update: async () => {
        const data: any = await formData.get("data");
        const dataJson = data ? JSON.parse(data) : {};
        await orderService.updateOrder({
          id: params.id as string,
          ...dataJson,
        });
        return Response.json({ success: true });
      },
    });
  } catch (error: any) {
    return { error: error.message || "Request failed" };
  }
}

export default function OrderItem() {
  const loaderData = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const fetcher = useFetcher<typeof action>();
  const [searchParams, setSearchParams] = useSearchParams();
  const isEdit = searchParams.get("edit") === "1";
  const order: any = (loaderData as any)?.data ?? loaderData;
  const invoices: any[] = (loaderData as any)?.invoices ?? [];
  const { t } = useTranslation();
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selection, setSelection] = useState<Record<number, { checked: boolean; qty: number }>>({});
  const [printInvoices, setPrintInvoices] = useState<any[] | null>(null);
  const [isPrintFetching, setIsPrintFetching] = useState(false);
  const form = useForm<OrderSchema>({    defaultValues: {
      customer: undefined,
      orderDetails: (order?.orderDetails || []).map((detail: any) => ({
        productId: detail.productId,
        variantId: detail.variantId ?? undefined,
        name: detail.name,
        quantity: Number(detail.quantity),
        price: Number(detail.price),
        buyPrice: Number(detail.buyPrice),
        // Backend has no per-line VAT column yet: prefer a stored line VAT,
        // else the line's product/variant snapshot, else the header VAT.
        VAT: detail.VAT ?? detail.taxRate ?? detail.product?.VAT ?? detail.variant?.VAT ?? order?.VAT ?? "0",
        note: detail.note || "",
      })),
      price: order?.price || 0,
      VAT: order?.VAT,
      surcharge: order?.surcharge || "0",
      paid: order?.paid || 0,
      paymentType: order?.paymentType || "cash",
    },
    resolver: orderSchema,
  });

  const { submit, isLoading } = useSubmitPromise();
  const invoiceFetcher = useFetcher({ key: "Invoice-Fetcher" });

  // Unified POS search for edit mode: exact scans auto-add a line, the
  // fallback list carries actionable variants (real-time stock per warehouse).
  const { rows: searchedRows, search: searchProducts } = useUnifiedProductSearch({
    context: "POS",
    onExactMatch: (item) => {
      const currentValue: OrderDetailSchema[] = form.getValues("orderDetails") || [];
      const headerVAT = form.getValues("VAT") ?? order?.VAT ?? "0";
      currentValue.push({
        productId: item.product_id,
        variantId: item.variant_id,
        name: item.display_name,
        quantity: 1,
        price: item.price,
        buyPrice: item.price,
        VAT: headerVAT,
        note: "",
      });
      form.setValue("orderDetails", currentValue);
    },
  });

  // Print a single invoice or all invoices via the body-level InvisiblePrintContainer.
  // The container (InvoicePrintPortal) mounts ONLY the targeted invoice(s) and
  // injects a single @media print stylesheet. We await waitForPrintReady() inside
  // printInvoiceViaBrowser() so window.print() never snapshots a blank portal.
  useEffect(() => {
    if (printInvoices && printInvoices.length > 0) {
      let cancelled = false;
      void (async () => {
        await printInvoiceViaBrowser();
        if (!cancelled) {
          window.setTimeout(() => setPrintInvoices(null), 1200);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [printInvoices]);

  // Fetch full invoice detail(s) before printing (Way A). Falls back to
  // opening /invoices/:id?print=true in a new tab (Way B) on failure so the
  // user never sees a blank preview.
  const fetchInvoiceDetail = async (invoiceId: number | string): Promise<any> => {
    const response = await submit<{ invoice: IInvoice }>(
      { id: invoiceId as string },
      { method: "get", action: `/invoices/${invoiceId}` },
    );
    return response.invoice;
  };

  const handlePrintSingle = async (summary: any) => {
    const id = summary?.id;
    if (!id) return;
    setIsPrintFetching(true);
    try {
      const detail = await fetchInvoiceDetail(id);
      setPrintInvoices([detail]);
    } catch (e) {
      console.warn("print single: detail fetch failed, falling back to new tab", e);
      window.open(`/invoices/${id}?print=true`, "_blank");
    } finally {
      setIsPrintFetching(false);
    }
  };

  const handlePrintAll = async () => {
    if (!invoices.length) return;
    setIsPrintFetching(true);
    try {
      const details = await Promise.all(invoices.map((inv: any) => fetchInvoiceDetail(inv.id)));
      setPrintInvoices(details);
    } catch (e) {
      console.warn("print all: detail fetch failed, falling back to per-invoice tabs", e);
      // Fallback: open the first invoice with print flag; user can print sequentially
      window.open(`/invoices/${invoices[0].id}?print=true`, "_blank");
    } finally {
      setIsPrintFetching(false);
    }
  };

  // After creating an invoice, stay on the page: loader revalidates so the
  // per-line badges (đã xuất / còn lại) and the invoice list refresh.
  // useEffect(() => {
  //   if (fetcher.state === "idle" && fetcher.data && !("error" in (fetcher.data as any))) {
  //     const result: any = fetcher.data;
  //     if (result.invoiceId) {
  //       toast.success({ title: "Success", message: "Đã tạo hóa đơn từ đơn hàng" });
  //       setShowInvoiceModal(false);
  //       setSelection({});
  //     }
  //     if ((result as any).error) {
  //       toast.danger({ title: "Error", message: (result as any).error });
  //     }
  //     if (result.ok) {
  //       toast.success({ title: "Success", message: "Cập nhật đơn hàng thành công" });
  //       setSearchParams({}, { replace: true });
  //       form.reset(form.getValues());
  //     }
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [fetcher.state, fetcher.data]);

  const handleError = (errors: any) => {
    console.log("errors", errors);
  };

  const handleFilterProduct = (queryString: string) => {
    searchProducts(queryString);
  };

  const handleAdd = (item: IProduct) => {
    const currentValue: OrderDetailSchema[] = form.getValues("orderDetails") || [];
    const headerVAT = form.getValues("VAT") ?? order?.VAT ?? "0";
    // Unified POS rows already carry their actionable variant.
    const unifiedVariant = (item as IProductSearchRow).unifiedVariant;
    if (unifiedVariant) {
      const price = Number(unifiedVariant.salePrice ?? unifiedVariant.regularPrice ?? item.regularPrice ?? 0);
      const lineVAT =
        item.VAT !== undefined && item.VAT !== null && String(item.VAT).trim() !== "" ? item.VAT : headerVAT;
      const index = currentValue.findIndex(
        (cItem) => item.id === cItem.productId && unifiedVariant.id === (cItem.variantId ?? undefined),
      );
      if (index === -1) {
        currentValue.push({
          productId: item.id,
          variantId: unifiedVariant.id,
          name: item.name,
          quantity: 1,
          price,
          buyPrice: price,
          VAT: lineVAT,
          note: "",
        });
      } else {
        const target = { ...currentValue[index] };
        target.quantity = Number(target.quantity) + 1;
        target.buyPrice = Number(target.quantity) * Number(target.price);
        currentValue[index] = target;
      }
      form.setValue("orderDetails", currentValue);
      return;
    }
    const lineVAT =
      item.VAT !== undefined && item.VAT !== null && String(item.VAT).trim() !== "" ? item.VAT : headerVAT;
    const index = currentValue.findIndex((cItem) => item.id === cItem.productId && cItem.productId);
    if (index === -1) {
      currentValue.push({
        productId: item.id,
        name: item.name,
        quantity: 1,
        price: Number(item.regularPrice),
        buyPrice: Number(item.regularPrice),
        VAT: lineVAT,
        note: "",
      });
    } else {
      const target = { ...currentValue[index] };
      target.quantity = Number(target.quantity) + 1;
      target.buyPrice = Number(target.quantity) * Number(target.price);
      currentValue[index] = target;
    }
    form.setValue("orderDetails", currentValue);
  };

  const onSubmitEdit = async (v: OrderSchema) => {
    try {
      await submit({ intent: "update", data: JSON.stringify(v) }, { method: "post" });
      toast.success({ title: "Success", message: "Cập nhật đơn hàng thành công" });
      setSearchParams({}, { replace: true });
    } catch (err) {
      console.log("error", err);
      toast.danger({ title: "Error", message: "Cập nhật đơn hàng thất bại" });
    }
  };

  const lines = useMemo(() => order?.orderDetails || [], [order]);
  const remainingOf = (d: any) => lineRemaining(d);

  const openInvoiceModal = () => {
    setSelection(defaultSelection(lines));
    setShowInvoiceModal(true);
  };

  const toggleLine = (detailId: number) => {
    setSelection((prev) => {
      const cur = prev[detailId];
      if (!cur) return prev;
      const line = lines.find((d: any) => Number(d.id) === detailId);
      const rem = line ? remainingOf(line) : cur.qty;
      return { ...prev, [detailId]: { checked: !cur.checked, qty: rem } };
    });
  };

  const changeLineQty = (detailId: number, qty: number) => {
    const line = lines.find((d: any) => Number(d.id) === detailId);
    const rem = line ? remainingOf(line) : 0;
    const clamped = clampLineQty(qty, rem);
    setSelection((prev) => ({ ...prev, [detailId]: { checked: prev[detailId]?.checked ?? true, qty: clamped } }));
  };

  const selectedLines = useMemo(
    () =>
      Object.entries(selection)
        .filter(([, s]) => s.checked && s.qty > 0)
        .map(([id, s]) => ({ order_detail_id: Number(id), quantity: s.qty })),
    [selection],
  );

  const derivedType = useMemo(() => deriveInvoiceType(lines, selectedLines), [selectedLines, lines]);

  const submitInvoiceModal = () => {
    if (selectedLines.length === 0) {
      toast.danger({ title: "Error", message: "Chọn ít nhất 1 dòng với số lượng > 0" });
      return;
    }
    submit({ intent: "create-invoice", lines: JSON.stringify(selectedLines) }, { method: "post" });
  };

  // QZ Tray device printing is disabled — browser print only.
  // NOTE (re-enable later): restore `handleDevicePrint` via
  // `printReceiptToDevice` (see git history).

  const data = searchedRows;

  // ---------- Edit mode ----------
  if (isEdit) {
    return (
      <FormProvider {...form}>
        <div className="w-full flex flex-col p-3 gap-3 overflow-auto h-full bg-slate-50/50 dark:bg-transparent no-print">
          <div className="w-full mx-auto">
            <CardItem
              title={
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                      <Icon name="shopping-cart" fontSize={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">
                        {t("orders.editOrder")} - {order?.code || ""}
                      </h2>
                      <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                        {t("orders.formHint")}
                      </p>
                    </div>
                  </div>
                </div>
              }
              className="p-5 sm:p-6"
              action={
                <TMButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchParams({}, { replace: true })}
                  type="button"
                >
                  {t("common.cancel")}
                </TMButton>
              }
            >
              <div className="flex flex-col gap-5 mt-2">
                <OrderForm
                  products={data}
                  addProduct={handleAdd}
                  onProductFilter={handleFilterProduct}
                  isLoading={isLoading}
                  onSubmit={onSubmitEdit}
                  onError={handleError}
                  submitLabel={t("common.save")}
                />
                {/* <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 mt-1">
                  <TMButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchParams({}, { replace: true })}
                    type="button"
                  >
                    {t("common.cancel")}
                  </TMButton>
                  <TMButton
                    htmlType="submit"
                    loading={isLoading}
                    size="sm"
                    onClick={form.handleSubmit(onSubmitEdit as any)}
                  >
                    <Icon name="save" fontSize={16} />
                    {t("common.save")}
                  </TMButton>
                </div> */}
              </div>
            </CardItem>
          </div>
        </div>
      </FormProvider>
    );
  }

  // ---------- Read-only detail mode ----------
  const items = order?.orderDetails || [];
  // Line math (same as the OrderDetails editor):
  // base = buyPrice snapshot (already qty x unit price, excl. VAT),
  // line total = base x (1 + lineVAT / 100).
  // Subtotal = Σ VAT-inclusive line totals; header VAT (defaultTax)
  // applies on top: VAT = subtotal x defaultTax / 100, total = subtotal + VAT.
  const defaultTaxRate = Number(order?.VAT ?? 0);
  const lineVatRateOf = (item: any) =>
    Number(item?.VAT ?? item?.taxRate ?? item?.product?.VAT ?? item?.variant?.VAT ?? order?.VAT ?? 0);
  const lineBaseOf = (item: any) => Number(item?.buyPrice ?? Number(item?.quantity || 0) * Number(item?.price || 0));
  const lineTotalInclOf = (item: any) => lineBaseOf(item) * (1 + lineVatRateOf(item) / 100);
  const lineVatAmountOf = (item: any) => (lineBaseOf(item) * lineVatRateOf(item)) / 100;
  const subtotal = items.reduce((sum: number, d: any) => sum + lineTotalInclOf(d), 0);
  const vatAmount = (subtotal * defaultTaxRate) / 100;
  const totalPaid = subtotal + Number(order?.surcharge || 0) + vatAmount;

  return (
    <div className="w-full flex flex-col p-3 gap-3 overflow-auto h-full bg-slate-50/50 dark:bg-transparent">
      <div className="max-w-5xl w-full mx-auto flex flex-col gap-3">
        {/* Toolbar */}

        {/* Order lines reference (screen only — temp print uses the invoice above) */}
        <CardItem
          title={
            <div className="flex items-start justify-between gap-4 no-print">
              <div className="flex gap-3">
                <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                  <Icon name="shopping-cart" fontSize={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">
                    {t("orders.detailTitle")} {order?.code || ""}
                  </h2>
                  <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                    {order?.createdAt ? new Date(order.createdAt).toLocaleString("vi-VN") : ""}
                  </p>
                </div>
              </div>
            </div>
          }
          className="p-5 sm:p-6 overflow-x-auto"
          action={
            <div className="flex gap-2 shrink-0 no-print justify-start sm:justify-end flex-wrap">
              <TMButton variant="outline" onClick={() => setSearchParams({ edit: "1" })} size="sm">
                <Icon name="edit" fontSize={16} />
                <span className="hidden sm:inline">{t("orders.editOrder")}</span>
              </TMButton>
              {/* Returns are only for sale orders (imports flow the other way) */}
              {order?.providerId == null && order?.status !== "returned" && (
                <TMButton
                  variant="outline"
                  onClick={() => navigate(`./return`)}
                  size="sm"
                  className="text-red-600 hover:bg-red-50"
                >
                  <Icon name="corner-up-left" fontSize={16} />
                  <span className="hidden sm:inline">Trả hàng</span>
                </TMButton>
              )}
              <TMButton onClick={openInvoiceModal} loading={fetcher.state !== "idle"} size="sm">
                <Icon name="plus" fontSize={16} />
                <span className="hidden sm:inline">{t("orders.createInvoice")}</span>
              </TMButton>
            </div>
          }
        >
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <p className="text-lg font-bold text-slate-900 dark:text-white">Mã đơn hàng: {order?.code || ""}</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Kho: {(order as any)?.warehouse?.name || order?.warehouseId || "-"}
                </p>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {order?.createdAt ? new Date(order.createdAt).toLocaleString("vi-VN") : ""}
                </p>
              </div>
              <div className="flex gap-2">
                {order?.status === "partially_returned" && (
                  <span className="px-3 py-1 rounded text-sm bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                    Trả một phần
                  </span>
                )}
                {order?.status === "returned" && (
                  <span className="px-3 py-1 rounded text-sm bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300">
                    Đã trả hết
                  </span>
                )}
                <span className="px-3 py-1 rounded text-sm bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-200">
                  {order?.paymentType === "transfer" ? t("invoices.detail.transfer") : t("invoices.detail.cash")}
                </span>
              </div>
            </div>

            {/* Items with invoice progress: ordered / invoiced / remaining */}
            <div className="border border-slate-200 dark:border-slate-700 rounded overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm text-slate-700 dark:text-slate-200">
                <thead className="bg-gray-50 dark:bg-slate-700/60">
                  <tr>
                    <th className="p-2 text-left font-medium text-slate-500 dark:text-slate-300">
                      {t("importOrder.product")}
                    </th>
                    <th className="p-2 text-right font-medium text-slate-500 dark:text-slate-300">
                      {t("orders.quantity")}
                    </th>
                    <th className="p-2 text-right font-medium text-slate-500 dark:text-slate-300">
                      {t("importOrder.price")}
                    </th>
                    <th className="p-2 text-right font-medium text-slate-500 dark:text-slate-300">VAT (%)</th>
                    <th className="p-2 text-right font-medium text-slate-500 dark:text-slate-300">
                      Thành tiền (gồm VAT)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800">
                  {items.map((item: any, index: number) => {
                    const ordered = Number(item.quantity || 0);
                    const lineBase = lineBaseOf(item);
                    const lineTotal = lineTotalInclOf(item);
                    const vatRate = lineVatRateOf(item);
                    const vatAmount = lineVatAmountOf(item);

                    return (
                      <React.Fragment key={item.id}>
                        <tr className="border-t border-slate-100 dark:border-slate-700 odd:bg-white even:bg-slate-50 dark:odd:bg-slate-800 dark:even:bg-slate-700/40">
                          <td className="p-2">
                            <div className="flex flex-col text-slate-800 dark:text-slate-100">
                              <div className="font-medium">{item.name || `#${item.productId}`}</div>

                              {item.variant?.attributeValues?.length ? (
                                <div className="text-xs text-gray-500 dark:text-slate-400">
                                  {item.variant.attributeValues
                                    .map(
                                      (attr: { attribute: { name: string }; value: string }) =>
                                        `${attr.attribute?.name}: ${attr.value}`,
                                    )
                                    .join(", ")}
                                </div>
                              ) : null}
                            </div>
                          </td>
                          <td className="p-2 text-right">{ordered}</td>
                          <td className="p-2 text-right">{formatCurrency(item.price)}</td>
                          <td className="p-2 text-right">{vatRate}%</td>
                          <td className="p-2 text-right">{formatCurrency(lineTotal)}</td>
                        </tr>
                        {(vatRate > 0 || vatAmount > 0) && (
                          <tr className="border-t-0 text-slate-500 dark:text-slate-400 italic">
                            <td className="px-2 pb-2 pt-0 text-[0.9em]">
                              └ VAT ({vatRate}%) trên {formatCurrency(lineBase)}
                            </td>
                            <td className="px-2 pb-2 pt-0"></td>
                            <td className="px-2 pb-2 pt-0"></td>
                            <td className="px-2 pb-2 pt-0"></td>
                            <td className="px-2 pb-2 pt-0 text-right text-[0.9em]">+ {formatCurrency(vatAmount)}</td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals — Tạm tính (gồm VAT dòng) / VAT chung (defaultTax) / Giảm giá / Phụ thu / Tổng thanh toán */}
            <div className="flex justify-end">
              <div className="w-full sm:w-72 sm:ml-auto space-y-2 text-slate-700 dark:text-slate-200">
                <div className="flex justify-between">
                  <span>Tạm tính (gồm VAT dòng)</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT chung ({defaultTaxRate}%)</span>
                  <span className="font-medium">{formatCurrency(vatAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Giảm giá</span>
                  <span className="font-medium">{formatCurrency((order as any)?.discount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phụ thu</span>
                  <span className="font-medium">{formatCurrency(order?.surcharge || 0)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-slate-200 dark:border-slate-700 pt-2">
                  <span>Tổng tiền thanh toán</span>
                  <span className="text-blue-600 dark:text-blue-400">{formatCurrency(totalPaid)}</span>
                </div>
              </div>
            </div>

            {/* <p className="text-xs text-gray-400 text-center">{t("orders.tempInvoiceNotice")}</p> */}
          </div>
        </CardItem>

        {/* Hóa đơn đã xuất: one row per invoice, each with its own Print. */}
        <CardItem
          title={
            <div className="flex items-start justify-between gap-4 no-print">
              <div className="flex gap-3">
                <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                  <Icon name="file-text" fontSize={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">
                    {t("orders.issuedInvoices", { defaultValue: "Hóa đơn đã xuất" })} ({invoices.length})
                  </h2>
                  <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                    {t("orders.issuedInvoicesHint", {
                      defaultValue: "In theo từng hóa đơn, không in gộp theo đơn hàng",
                    })}
                  </p>
                </div>
              </div>
            </div>
          }
          className="p-5 sm:p-6 overflow-x-auto"
          action={
            <TMButton
              variant="outline"
              onClick={handlePrintAll}
              size="sm"
              disabled={!invoices.length || isPrintFetching}
              loading={isPrintFetching}
            >
              <Icon name="printer" fontSize={16} />
              <span className="hidden sm:inline">{t("orders.printAllInvoices", { defaultValue: "In gộp" })}</span>
            </TMButton>
          }
        >
          {invoices.length === 0 ? (
            <p className="text-sm text-slate-500">
              {t("orders.noInvoices", { defaultValue: "Chưa có hóa đơn nào. Bấm Tạo hóa đơn để xuất đợt đầu tiên." })}
            </p>
          ) : (
            <div className="border border-slate-200 dark:border-slate-700 rounded overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm text-slate-700 dark:text-slate-200">
                <thead className="bg-gray-50 dark:bg-slate-700/60">
                  <tr>
                    <th className="p-2 text-left font-medium">{t("invoices.invoiceNumber")}</th>
                    <th className="p-2 w-24 text-center font-medium">{t("invoices.type", { defaultValue: "Loại" })}</th>
                    <th className="p-2 w-40 text-right font-medium">{t("invoices.total")}</th>
                    <th className="p-2 w-40 text-center font-medium">{t("invoices.statusLabel")}</th>
                    <th className="p-2 w-20 text-right font-medium "></th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800">
                  {invoices.map((inv: any, idx: number) => (
                    <tr key={inv.id} className="border-t border-slate-100 dark:border-slate-700">
                      <td className="p-2">
                        <div className="flex flex-col">
                          <span className="font-medium">{inv.invoiceNumber}</span>
                          <span className="text-xs text-slate-400">
                            {t("orders.invoiceBatch", {
                              defaultValue: `Hóa đơn ${idx + 1}/${invoices.length}`,
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        <span
                          className={
                            inv.invoiceType === "FULL"
                              ? "px-2 py-0.5 rounded text-xs bg-green-100 text-green-800"
                              : "px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800"
                          }
                        >
                          {inv.invoiceType || "FULL"}
                        </span>
                      </td>
                      <td className="p-2 text-right">{formatCurrency(inv.total)}</td>
                      <td className="p-2 text-center text-xs">{t(`invoices.status.${inv.status}`)}</td>
                      <td className="p-2 text-right whitespace-nowrap">
                        <div className="flex gap-2">
                          <TMButton
                            // variant="outline"
                            size="sm"
                            className="py-2"
                            onClick={() => navigate(`/invoices/${inv.id}`)}
                          >
                            <Icon name="eye" fontSize={16} />
                            {/* {t("common.view", { defaultValue: "Xem" })} */}
                          </TMButton>{" "}
                          <TMButton
                            // variant="outline"
                            size="sm"
                            className="py-2"
                            onClick={() => handlePrintSingle(inv)}
                            loading={isPrintFetching}
                            disabled={isPrintFetching}
                          >
                            <Icon name="printer" fontSize={16} />
                            {/* {t("common.print", { defaultValue: "In" })} */}
                          </TMButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardItem>
      </div>

      {/* Create-invoice modal: pick lines + qty (max = remaining, disable when 0) */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
          <div className="w-full max-w-2xl rounded-lg bg-white dark:bg-slate-800 shadow-xl p-5 max-h-[85vh] overflow-auto">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-base font-semibold">{t("orders.createInvoice")}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t("orders.createInvoiceHint", {
                    defaultValue: "Chọn dòng và số lượng đưa vào hóa đơn mới. Loại FULL/PARTIAL tự xác định.",
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInvoiceModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="border rounded overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="bg-gray-50 dark:bg-slate-700/60">
                  <tr>
                    <th className="p-2 w-10"></th>
                    <th className="p-2 text-left">{t("importOrder.product")}</th>
                    <th className="p-2 w-24 text-right">{t("orders.remaining", { defaultValue: "Còn lại" })}</th>
                    <th className="p-2 w-32 text-right">{t("importOrder.quantity")}</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((d: any) => {
                    const id = Number(d.id);
                    const rem = remainingOf(d);
                    const st = selection[id];
                    const disabled = rem <= 0;
                    return (
                      <tr key={id} className="border-t">
                        <td className="p-2 text-center">
                          <input
                            type="checkbox"
                            disabled={disabled}
                            checked={st?.checked ?? false}
                            onChange={() => toggleLine(id)}
                          />
                        </td>
                        <td className="p-2">{d.name || `#${d.productId}`}</td>
                        <td className="p-2 text-right">{rem}</td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            min={0}
                            max={rem}
                            disabled={disabled || !st?.checked}
                            value={st?.qty ?? rem}
                            onChange={(e) => changeLineQty(id, Number(e.target.value))}
                            className="w-24 border rounded px-2 py-1 text-right disabled:opacity-40"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
              <span className="text-xs text-slate-500">
                {derivedType
                  ? t("orders.derivedType", { defaultValue: `Loại hóa đơn: ${derivedType}` } as any)
                  : t("orders.noLinesSelected", { defaultValue: "Chưa chọn dòng nào" })}
              </span>
              <div className="flex gap-2">
                <TMButton variant="ghost" size="sm" type="button" onClick={() => setShowInvoiceModal(false)}>
                  {t("common.cancel")}
                </TMButton>
                <TMButton size="sm" loading={fetcher.state !== "idle"} onClick={submitInvoiceModal}>
                  {t("orders.createInvoice")}
                </TMButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print-only container: renders ONLY targeted invoice(s), one ReceiptPrinter each}.
       * This stays mounted until afterprint fires so the portal has DOM content
       * and the @media print styles are injected before window.print() snapshots.
       * The data is pre-fetched via fetchInvoiceDetail() so the print preview contains
       * full invoiceDetails (product names, prices, etc.) instead of a blank summary.
       */}
      {printInvoices && printInvoices.length > 0 && (
        <div style={{ display: "none" }}>
          {printInvoices.map((inv: any, idx: number) => (
            <ReceiptPrinter
              key={inv.id}
              invoice={inv}
              orderCode={order?.code}
              invoiceIndex={invoices.findIndex((v: any) => v.id === inv.id) + 1 || idx + 1}
              invoiceTotal={invoices.length || printInvoices.length}
            />
          ))}
        </div>
      )}

      <div className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
        <p>Cảm ơn bạn đã mua hàng!</p>
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  return <ErrorComponent />;
}

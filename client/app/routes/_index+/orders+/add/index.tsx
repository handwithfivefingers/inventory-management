import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { useFetcher, useNavigate, useOutletContext } from "@remix-run/react";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { orderService } from "~/action.server/order.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { OrderForm } from "~/components/form/order-form";
import { Icon } from "~/components/icon";
import { toast } from "~/components/notification";
import { VariantPickerModal } from "~/components/variant-picker-modal";
import { OrderDetailSchema, OrderSchema, orderSchema } from "~/constants/schema/order";
import { useSubmitPromise } from "~/hooks";
import { useUnifiedProductSearch } from "~/hooks/use-unified-product-search";
import { useTranslation } from "~/i18n";
import { IProduct, IProductSearchRow, IProductVariant } from "~/types/product";
import type { IVendorSettings } from "~/types/setting";
import { MainLayoutContext } from "../../_layout";

const PRINT_STYLES = `
@media print {
  body * { visibility: hidden; }
  .invoice-print, .invoice-print * { visibility: visible; }
  .invoice-print {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    padding: 24px;
    box-shadow: none !important;
    border: none !important;
  }
  .no-print { display: none !important; }
}
`;

export const meta: MetaFunction = () => {
  return [{ title: "Tạo đơn hàng" }];
};

/**
 * Resolve a new order line's VAT %: variant override wins, then the parent
 * product VAT, then the current header VAT (fallback for lines picked before
 * the product VAT column existed). Blank/undefined means "use header VAT".
 */
const resolveLineVAT = (product?: any, variant?: any, fallback?: number | string | null): number | string => {
  const pick = (v: unknown) =>
    v !== undefined && v !== null && String(v).trim() !== "" ? (v as number | string) : undefined;
  return pick(variant?.VAT) ?? pick(product?.VAT) ?? pick(fallback) ?? "0";
};

export default function OrderItem() {
  const navigate = useNavigate();
  const { settings } = useOutletContext<MainLayoutContext>();
  const { t } = useTranslation();
  const [showTempInvoice, setShowTempInvoice] = useState(false);
  console.log("settings", settings);
  const form = useForm<OrderSchema>({
    defaultValues: {
      customer: undefined,
      orderDetails: [],
      price: 0,
      // `??` (not `||`): an explicit vendor defaultTaxRate of 0 must stay 0.
      VAT: settings.defaultTaxRate ?? 0,
      surcharge: "0",
      paid: 0,
      paymentType: "cash",
      channel: "WHOLESALE",
    },
    resolver: orderSchema,
  });

  const { submit, isLoading } = useSubmitPromise();

  // Unified POS search: exact scans auto-add a line, the fallback list carries
  // actionable variants (real-time stock per warehouse).
  const { rows: searchedRows, search: searchProducts } = useUnifiedProductSearch({
    context: "POS",
    onExactMatch: (item) => {
      form.setValue(
        "orderDetails",
        addLine(form.getValues("orderDetails") || [], {
          productId: item.product_id,
          variantId: item.variant_id,
          name: item.display_name,
          price: item.price,
          VAT: resolveLineVAT(undefined, undefined, form.getValues("VAT")),
          note: "",
        }),
      );
    },
  });
  const data = searchedRows;

  // Variant picking: when a variable product is chosen, its variants are
  // loaded through the /products action (variantOf=<id>) and shown in a modal.
  const variantsFetcher = useFetcher<{
    data: { data: IProductVariant[]; total: number };
  }>({
    key: "Product-Variants",
  });
  const [variantTarget, setVariantTarget] = useState<IProduct | null>(null);
  const [showVariantPicker, setShowVariantPicker] = useState(false);

  const handleError = (errors: any) => {
    console.log("errors", errors);
  };

  const handleFilterProduct = (value: string) => {
    searchProducts(value);
  };

  const addLine = (
    currentValue: OrderDetailSchema[],
    line: Omit<OrderDetailSchema, "quantity"> & { quantity?: number | string },
  ): OrderDetailSchema[] => {
    const result = {
      ...line,
      quantity: line.quantity ?? 1,
      buyPrice: Number(line.price),
    } as OrderDetailSchema;
    if (!currentValue.length) return [result];
    const index = currentValue.findIndex(
      (cItem) =>
        cItem.productId === result.productId && (cItem.variantId ?? undefined) === (result.variantId ?? undefined),
    );
    if (index === -1) {
      currentValue.push(result);
    } else {
      const target = { ...currentValue[index] };
      target.quantity = Number(target.quantity) + 1;
      target.buyPrice = Number(target.quantity) * Number(target.price);
      currentValue[index] = target;
    }
    return currentValue;
  };

  const pickVariant = (variant: IProductVariant) => {
    if (!variantTarget) return;
    const price = Number(variant.salePrice ?? variantTarget.regularPrice ?? 0);
    form.setValue(
      "orderDetails",
      addLine(form.getValues("orderDetails") || [], {
        productId: variantTarget.id,
        variantId: variant.id,
        name: `${variantTarget.name} (${(variant.attributeValues || []).map((v: any) => v.value).join(" / ")})`,
        price,
        VAT: resolveLineVAT(variantTarget, variant, form.getValues("VAT")),
        note: "",
      }),
    );
    setShowVariantPicker(false);
    setVariantTarget(null);
  };

  const handleAdd = (item: IProduct, variant?: IProductVariant) => {
    // Unified POS rows already carry their actionable variant — add directly.
    const unifiedVariant = (item as IProductSearchRow).unifiedVariant ?? variant;
    if (unifiedVariant && (item as IProductSearchRow).unifiedVariant) {
      const price = Number(unifiedVariant.salePrice ?? unifiedVariant.regularPrice ?? item.regularPrice ?? 0);
      form.setValue(
        "orderDetails",
        addLine(form.getValues("orderDetails") || [], {
          productId: item.id,
          variantId: unifiedVariant.id,
          name: item.name,
          price,
          VAT: resolveLineVAT(item, unifiedVariant, form.getValues("VAT")),
          note: "",
        }),
      );
      return;
    }
    if (variant) {
      const price = Number(variant.salePrice ?? variant.regularPrice ?? item.regularPrice ?? 0);
      form.setValue(
        "orderDetails",
        addLine(form.getValues("orderDetails") || [], {
          productId: item.id,
          variantId: variant.id,
          name: `${item.name} (${
            (variant.attributeValues || [])
              .map((v: any) => v.value)
              .filter(Boolean)
              .join(" / ") || variant.skuCode
          })`,
          price,
          VAT: resolveLineVAT(item, variant, form.getValues("VAT")),
          note: "",
        }),
      );
      return;
    }
    // Variable products need a specific variant before a line can be added
    if (Number((item as any).variantCount) > 0) {
      setVariantTarget(item);
      setShowVariantPicker(true);
      variantsFetcher.submit({ variantOf: String(item.id) }, { method: "POST", action: "/products" });
      return;
    }
    form.setValue(
      "orderDetails",
      addLine(form.getValues("orderDetails") || [], {
        productId: item.id,
        name: item.name,
        price: Number(item.regularPrice),
        VAT: resolveLineVAT(item, undefined, form.getValues("VAT")),
        note: "",
      }),
    );
  };

  const onSubmit = async (v: OrderSchema) => {
    try {
      const params = {
        ...v,
        // price: total,
        // paid: totalPaid,
      };
      const resp = await submit<{ status: number; orderId?: number; invoiceId?: number }>(
        { data: JSON.stringify(params) },
        { method: "POST" },
      );
      console.log("onSubmit Create Order", resp);
      if (resp.status === 200 && resp.orderId) {
        toast.success({
          title: "Created",
          message: "Tạo đơn hàng thành công",
        });
        // Backend auto-creates the invoice for sales orders — go to the order
        // detail where the invoice can be viewed / temp-printed.
        navigate(`/orders/${resp.orderId}`);
        return;
      }
      throw resp;
    } catch (err) {
      console.log("error", err);
      toast.danger({ title: "Error", message: "Tạo đơn hàng thất bại" });
    }
  };

  const orderDetails = form.watch("orderDetails") as OrderDetailSchema[];
  const watchSurcharge = form.watch("surcharge");
  const watchVAT = form.watch("VAT");
  // Same math as the order detail page: line total = base x (1 + lineVAT / 100),
  // subtotal = Σ VAT-inclusive line totals, header VAT applies on top of it.
  const lineBaseOf = (item: OrderDetailSchema) => Number(item?.buyPrice || 0);
  const lineRateOf = (item: OrderDetailSchema) => Number((item as any)?.VAT ?? watchVAT ?? 0);
  const tempSubtotal = (orderDetails || []).reduce(
    (sum, item) => sum + lineBaseOf(item) * (1 + lineRateOf(item) / 100),
    0,
  );
  const tempVatAmount = (tempSubtotal * Number(watchVAT || 0)) / 100;
  const tempTotal = tempSubtotal + Number(watchSurcharge || 0) + tempVatAmount;

  return (
    <FormProvider {...form}>
      <style>{PRINT_STYLES}</style>
      <div className="w-full flex flex-col p-3 gap-3 overflow-auto h-full bg-slate-50/50 dark:bg-transparent">
        <div className="w-full mx-auto flex flex-col gap-3">
          {/* Temp invoice preview */}
          {/* {showTempInvoice && (
            <CardItem
              title={
                <div className="flex justify-between items-center">
                  <span>{t("orders.tempInvoice")}</span>
                  <button
                    type="button"
                    onClick={() => setShowTempInvoice(false)}
                    className="text-gray-500 hover:text-gray-700 no-print"
                  >
                    ✕
                  </button>
                </div>
              }
              className="p-6 invoice-print"
            >
              <div className="flex flex-col gap-4">
                <p className="text-lg font-bold">{t("orders.tempInvoice")}</p>
                <div className="border rounded overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-2 text-left">{t("importOrder.product")}</th>
                        <th className="p-2 w-24 text-right">{t("importOrder.quantity")}</th>
                        <th className="p-2 w-32 text-right">{t("importOrder.price")}</th>
                        <th className="p-2 w-32 text-right">{t("importOrder.total")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(orderDetails || []).map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2">{item.name}</td>
                          <td className="p-2 text-right">{item.quantity}</td>
                          <td className="p-2 text-right">{formatCurrency(item.price)}</td>
                          <td className="p-2 text-right">{formatCurrency(item.buyPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end">
                  <div className="w-full sm:w-72 sm:ml-auto space-y-2">
                    <div className="flex justify-between">
                      <span>{t("invoices.detail.subtotalLabel")}</span>
                      <span className="font-medium">{formatCurrency(tempSubtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("invoices.detail.surcharge")}</span>
                      <span className="font-medium">{formatCurrency(watchSurcharge || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>
                        {t("importOrder.VAT")} ({Number(watchVAT || 0)}%)
                      </span>
                      <span className="font-medium">{formatCurrency(tempVatAmount)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>{t("importOrder.totalPayable")}</span>
                      <span className="text-blue-600">{formatCurrency(tempTotal)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end no-print">
                  <TMButton variant="outline" onClick={() => setShowTempInvoice(false)}>
                    {t("common.cancel")}
                  </TMButton>
                  <TMButton variant="outline" onClick={() => window.print()}>
                    🖨 {t("common.print", { defaultValue: "Print" })}
                  </TMButton>
                </div>
                <p className="text-xs text-gray-400 text-center">{t("orders.tempInvoiceNotice")}</p>
              </div>
            </CardItem>
          )} */}
          <CardItem
            title={
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                <div className="flex gap-3 min-w-0">
                  <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                    <Icon name="shopping-cart" fontSize={20} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">Tạo đơn hàng</h2>
                    <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">Tạo đơn hàng mới</p>
                  </div>
                </div>
                {/* <TMButton
                  variant="outline"
                  size="xs"
                  type="button"
                  onClick={() => setShowTempInvoice(true)}
                  className="self-start sm:self-auto shrink-0"
                >
                  🧾 {t("orders.printTempInvoice")}
                </TMButton> */}
              </div>
            }
            className="flex flex-col w-full rounded-md bg-white shadow-2xl shadow-slate-200 gap-2 dark:bg-slate-800 dark:shadow-black/20 p-5 sm:p-6 h-full"
          >
            <OrderForm
              products={data}
              addProduct={handleAdd}
              onProductFilter={handleFilterProduct}
              isLoading={isLoading}
              onSubmit={onSubmit}
              onError={handleError}
            />
          </CardItem>
          <VariantPickerModal
            show={showVariantPicker}
            close={() => {
              setShowVariantPicker(false);
              setVariantTarget(null);
            }}
            product={variantTarget}
            variants={variantsFetcher?.data?.data?.data || []}
            loading={variantsFetcher.state !== "idle"}
            onSelect={pickVariant}
          />
          {/* <BarcodeScanner onScan={handleRetrieveData} start={canScan}>
           
          </BarcodeScanner> */}
        </div>
      </div>
    </FormProvider>
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const data: any = await formData.get("data");
  const dataJson = data ? JSON.parse(data) : {};
  const resp = await orderService.createOrder(dataJson);
  if (resp.status === 200) {
    // Backend POST /orders/create -> 200 { data: order } (OrderService.create
    // returns the Sequelize Order directly; POS auto-invoice runs in the same
    // tx but its return value is discarded, WHOLESALE has no auto-invoice).
    const payload: any = (resp as any)?.data;
    const order = payload?.data?.order ?? payload?.data ?? payload?.order ?? payload;
    return Response.json({
      orderId: order?.id,
      invoiceId: null,
      status: 200,
    });
  }
  return Response.json({ ...resp, status: 400 }, { status: 400 });
}
export function ErrorBoundary() {
  return <ErrorComponent />;
}

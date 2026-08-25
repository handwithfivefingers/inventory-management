import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { useFetcher, useOutletContext } from "@remix-run/react";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { orderService } from "~/action.server/order.service";
import { IVendorSettings } from "~/action.server/setting.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { TMButton } from "~/components/tm-button";
import { OrderForm } from "~/components/form/order-form";
import {
  VariantPickerModal,
} from "~/components/variant-picker-modal";
import { toast } from "~/components/notification";
import { OrderDetailSchema, OrderSchema, orderSchema } from "~/constants/schema/order";
import { formatCurrency } from "~/libs/format-currency";
import { useSubmitPromise } from "~/hooks";
import { parseCookieFromRequest } from "~/sessions";
import { IProduct, IProductVariant } from "~/types/product";
import { useTranslation } from "~/i18n";

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

export default function OrderItem() {
  const searchFetcher = useFetcher<{ data: { data: IProduct[] } }>({ key: "Products-Search" });
  const { settings } = useOutletContext<{ settings: IVendorSettings }>();
  const { t } = useTranslation();
  const [showTempInvoice, setShowTempInvoice] = useState(false);
  const form = useForm<OrderSchema>({
    defaultValues: {
      customer: undefined,
      orderDetails: [],
      price: 0,
      VAT: settings.defaultTaxRate || "5",
      surcharge: "0",
      paid: 0,
      paymentType: "cash",
    },
    resolver: orderSchema,
  });

  const { submit, isLoading } = useSubmitPromise();

  const data = searchFetcher?.data?.data?.data || [];

  // Variant picking: when a variable product is chosen, its variants are
  // loaded through the /products action (variantOf=<id>) and shown in a modal.
  const variantsFetcher = useFetcher<{ data: { data: IProductVariant[]; total: number } }>({
    key: "Product-Variants",
  });
  const [variantTarget, setVariantTarget] = useState<IProduct | null>(null);
  const [showVariantPicker, setShowVariantPicker] = useState(false);

  const handleError = (errors: any) => {
    console.log("errors", errors);
  };

  const handleFilterProduct = (value: string) => {
    searchFetcher.submit({ s: value }, { method: "POST", action: "/products" });
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
        cItem.productId === result.productId &&
        (cItem.variantId ?? undefined) === (result.variantId ?? undefined),
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
        name: `${variantTarget.name} (${(variant.attributeValues || [])
          .map((v: any) => v.value)
          .join(" / ")})`,
        price,
        note: "",
      }),
    );
    setShowVariantPicker(false);
    setVariantTarget(null);
  };

  const handleAdd = (item: IProduct) => {
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
      const resp = await submit({ data: JSON.stringify(params) }, { method: "POST" });
      toast.success({ title: "Created", message: "Tạo đơn hàng thành công" });
      return resp;
    } catch (err) {
      console.log("error", err);
      toast.danger({ title: "Error", message: "Tạo đơn hàng thất bại" });
    }
  };

  const orderDetails = form.watch("orderDetails") as OrderDetailSchema[];
  const watchSurcharge = form.watch("surcharge");
  const watchVAT = form.watch("VAT");
  const tempSubtotal = (orderDetails || []).reduce(
    (sum, item) => sum + Number(item?.buyPrice || 0),
    0,
  );
  const tempVatAmount = (tempSubtotal * Number(watchVAT || 0)) / 100;
  const tempTotal = tempSubtotal + Number(watchSurcharge || 0) + tempVatAmount;

  return (
    <FormProvider {...form}>
      <style>{PRINT_STYLES}</style>
      <div className="w-full flex flex-col p-2 gap-4">
        {/* Temp invoice preview */}
        {showTempInvoice && (
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
              <div className="border rounded overflow-hidden">
                <table className="w-full text-sm">
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
                <div className="w-72 space-y-2">
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
        )}
        <CardItem
          title={
            <div className="flex justify-between items-center">
              <label className="text-lg">Tạo đơn hàng</label>
              <TMButton
                variant="outline"
                size="xs"
                type="button"
                onClick={() => setShowTempInvoice(true)}
              >
                🧾 {t("orders.printTempInvoice")}
              </TMButton>
            </div>
          }
          className="min-h-80 p-4"
        >
          <OrderForm
            products={data}
            addProduct={handleAdd}
            onProductFilter={handleFilterProduct}
            isLoading={isLoading}
            onSubmit={onSubmit}
            onError={handleError}
          />
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
            <form className="flex gap-4 flex-col" onSubmit={formMethods.handleSubmit(onSubmit, handleError)}>
              <div className="col-span-12 grid grid-cols-12 gap-2 py-2 mb-4 border-b border-indigo-600 dark:border-slate-400">
                <div className="col-span-1 ">STT</div>
                <div className="col-span-4">Tên sản phẩm</div>
                <div className="col-span-2 ">Số lượng</div>
                <div className="col-span-2 text-right">Giá tiền</div>
                <div className="col-span-3 text-right">Tổng tiền</div>
              </div>
              <div className="min-h-40 max-h-[45vh] overflow-auto flex flex-col gap-4 py-2">
                <OrderDetails ref={orderDetailsRef} />
              </div>
              <div className="col-span-12 grid grid-cols-12 gap-2 py-4 mt-4 border-t border-indigo-200 dark:border-slate-400">
                <div className="col-span-12 ml-auto flex flex-col gap-1">
                  <div className="w-96 flex justify-between ">
                    <span>Tổng tiền</span>
                    <NumberInput value={`${total}`} displayType="text" />
                  </div>
                  <div className="w-96 flex justify-between">
                    <span>Phụ phí</span>{" "}
                    <div className="w-40">
                      <FormInput name="surcharge">
                        {(field) => <NumberInput onValueChange={(v) => field.onChange(v.value)} />}
                      </FormInput>
                    </div>
                  </div>
                  <div className="w-96 flex justify-between">
                    <span> VAT </span>
                    <div className="w-40">
                      <FormControl name="VAT">
                        {(field) => (
                          <NumberInput
                            maxLength={4}
                            max={1000}
                            value={`${field.value}`}
                            onValueChange={(v) => field.onChange(v.value)}
                            suffix="%"
                          />
                        )}
                      </FormControl>
                    </div>
                  </div>
                  <div className="w-96 flex justify-between">
                    <span>Tổng tiền đơn hàng </span>
                    <NumberInput value={`${totalPaid}`} displayType="text" />
                  </div>
                  <div className="h-[2px] border-t border-indigo-600 dark:border-slate-400 my-2" />
                  <div className="w-96 flex justify-between font-bold">
                    <span>Tổng phải thu</span> <NumberInput value={`${totalPaid}`} displayType="text" />
                  </div>
                  <div className="w-96 flex justify-between">
                    <span>Đã thanh toán</span> <NumberInput value={`${totalPaid}`} displayType="text" />
                  </div>

                  <div className="h-[2px] border-t border-indigo-600 dark:border-slate-400 my-2" />

                  <div className="w-96 flex justify-end">
                    <TMButton htmlType="submit" size="md" variant="light" loading={isLoading}>
                      Tạo đơn hàng
                    </TMButton>
                  </div>
                </div>
              </div>
            </form>
            <ProductSearchModal
              data={data}
              close={() => setShow(false)}
              show={show}
              onSearch={handleFilterProduct}
              onSelect={handleAdd}
            />
          </BarcodeScanner> */}
        </CardItem>
      </div>
    </FormProvider>
  );
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const data: any = await formData.get("data");
  const dataJson = data ? JSON.parse(data) : {};
  const { warehouseId, cookie } = await parseCookieFromRequest(request);
  const params = {
    ...dataJson,
    warehouseId,
    cookie,
  };
  const resp = await orderService.createOrder(params);
  return resp;
};
export function ErrorBoundary() {
  return <ErrorComponent />;
}

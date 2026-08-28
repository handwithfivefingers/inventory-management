import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { LoaderFunctionArgs } from "@remix-run/node";
import { Link, useFetcher, useLoaderData, useNavigate, useSearchParams } from "@remix-run/react";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { invoiceService } from "~/action.server/invoice.service";
import { orderService } from "~/action.server/order.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { TMButton } from "~/components/tm-button";
import { OrderForm } from "~/components/form/order-form";
import { toast } from "~/components/notification";
import { OrderDetailSchema, OrderSchema, orderSchema } from "~/constants/schema/order";
import { formatCurrency } from "~/libs/format-currency";
import { IReceipt, printReceiptToDevice, stripDiacritics } from "~/libs/device-print";
import { useState } from "react";
import { useSubmitPromise } from "~/hooks";
import { parseCookieFromRequest } from "~/sessions";
import { IProduct } from "~/types/product";
import { useTranslation } from "~/i18n";
import { Icon } from "~/components/icon";

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
  return [{ title: "Chi tiết đơn hàng" }];
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { id } = params;
  const { cookie, warehouseId, vendorId } = await parseCookieFromRequest(request);
  if (!id) throw new Error("Không tìm thấy đơn hàng");
  const response = await orderService.getOrderById({
    id,
    cookie,
    warehouseId,
    vendorId,
  });
  return response.data;
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const { cookie, warehouseId, vendorId } = await parseCookieFromRequest(request);

  try {
    if (intent === "create-invoice") {
      // An invoice can only be created from this order — backend enforces it
      const resp: any = await invoiceService.createInvoice({
        orderId: Number(params.id),
        status: "draft",
        cookie,
        vendorId,
        ...(warehouseId ? { warehouseId: Number(warehouseId) } : {}),
      });
      return { invoiceId: resp?.data?.data?.id ?? resp?.data?.id };
    }

    // default: update order
    const data: any = await formData.get("data");
    const dataJson = data ? JSON.parse(data) : {};
    await orderService.updateOrder({
      id: params.id as string,
      ...dataJson,
      cookie,
      vendorId,
    });
    return { ok: true };
  } catch (error: any) {
    return { error: error.message || "Request failed" };
  }
};

export default function OrderItem() {
  const loaderData = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const fetcher = useFetcher<typeof action>();
  const [searchParams, setSearchParams] = useSearchParams();
  const isEdit = searchParams.get("edit") === "1";
  const order: any = (loaderData as any)?.data ?? loaderData;
  const { t } = useTranslation();

  const searchFetcher = useFetcher<{ data: { data: IProduct[]; total: number } }>({ key: "Products-Search" });
  const form = useForm<OrderSchema>({
    defaultValues: {
      customer: undefined,
      orderDetails: (order?.orderDetails || []).map((detail: any) => ({
        productId: detail.productId,
        variantId: detail.variantId ?? undefined,
        name: detail.name,
        quantity: Number(detail.quantity),
        price: Number(detail.price),
        buyPrice: Number(detail.buyPrice),
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

  // After creating an invoice, go see it
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data && !("error" in (fetcher.data as any))) {
      const result: any = fetcher.data;
      if (result.invoiceId) {
        toast.success({ title: "Success", message: "Đã tạo hóa đơn từ đơn hàng" });
        navigate(`/invoices/${result.invoiceId}`);
      }
      if (result.ok) {
        toast.success({ title: "Success", message: "Cập nhật đơn hàng thành công" });
        setSearchParams({}, { replace: true });
        form.reset(form.getValues());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state, fetcher.data]);

  const handleError = (errors: any) => {
    console.log("errors", errors);
  };

  const handleFilterProduct = (queryString: string) => {
    searchFetcher.submit({ s: queryString }, { method: "POST", action: "/products" });
  };

  const handleAdd = (item: IProduct) => {
    const currentValue: OrderDetailSchema[] = form.getValues("orderDetails") || [];
    const index = currentValue.findIndex((cItem) => item.id === cItem.productId && cItem.productId);
    if (index === -1) {
      currentValue.push({
        productId: item.id,
        name: item.name,
        quantity: 1,
        price: Number(item.regularPrice),
        buyPrice: Number(item.regularPrice),
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
    } catch (err) {
      console.log("error", err);
      toast.danger({ title: "Error", message: "Cập nhật đơn hàng thất bại" });
    }
  };

  const handleCreateInvoice = () => {
    fetcher.submit({ intent: "create-invoice" }, { method: "post" });
  };

  const handlePrintTempInvoice = () => window.print();

  // Direct USB (ESC/POS) printing — falls back to the browser dialog
  const [devicePrinting, setDevicePrinting] = useState(false);
  const handleDevicePrint = async () => {
    setDevicePrinting(true);
    try {
      const width = 42;
      const row = (left: string, right: string) => {
        const l = stripDiacritics(left);
        const r = stripDiacritics(right);
        return l + " ".repeat(Math.max(1, width - l.length - r.length)) + r;
      };
      const receipt: IReceipt = {
        title: t("orders.tempInvoice"),
        subtitle: `${order?.code || ""} - ${new Date(order?.createdAt).toLocaleString("vi-VN")}`,
        lines: [
          ...items.map((item: any) => ({
            text: row(`${item.name || `#${item.productId}`} x${item.quantity}`, formatCurrency(item.buyPrice)),
          })),
          { text: "-".repeat(width) },
          { text: row(t("invoices.detail.subtotalLabel"), formatCurrency(subtotal)) },
          {
            text: row(`${t("invoices.detail.surcharge")}`, formatCurrency(order?.surcharge || 0)),
          },
          { text: row(`${t("importOrder.VAT")} ${Number(order?.VAT || 0)}%`, formatCurrency(vatAmount)) },
          { text: "" },
          { text: row(t("importOrder.totalPayable"), formatCurrency(totalPaid)), bold: true, large: true },
        ],
        footer: t("orders.tempInvoiceNotice"),
      };
      const ok = await printReceiptToDevice(receipt);
      if (!ok) window.print();
    } finally {
      setDevicePrinting(false);
    }
  };

  const data = searchFetcher?.data?.data?.data || [];

  // ---------- Edit mode ----------
  if (isEdit) {
    return (
      <FormProvider {...form}>
        <div className="w-full flex flex-col p-2 gap-4 no-print">
          <CardItem
            title={
              <div className="flex justify-between items-center">
                <label className="text-lg">
                  {t("orders.editOrder")} - {order?.code || ""}
                </label>
              </div>
            }
            className="min-h-80 p-4"
          >
            <OrderForm
              products={data}
              addProduct={handleAdd}
              onProductFilter={handleFilterProduct}
              isLoading={isLoading}
              onSubmit={onSubmitEdit}
              onError={handleError}
              submitLabel={t("common.save")}
            />
            <div className="flex justify-end pt-2">
              <TMButton variant="outline" onClick={() => setSearchParams({}, { replace: true })}>
                {t("common.cancel")}
              </TMButton>
            </div>
          </CardItem>
        </div>
      </FormProvider>
    );
  }

  // ---------- Read-only detail mode ----------
  const items = order?.orderDetails || [];
  const subtotal = items.reduce((sum: number, d: any) => sum + Number(d.buyPrice || 0), 0);
  const vatAmount = (subtotal * Number(order?.VAT || 0)) / 100;
  const totalPaid = subtotal + Number(order?.surcharge || 0) + vatAmount;

  return (
    <div className="w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <style>{PRINT_STYLES}</style>

      {/* Toolbar */}
      <div className="flex gap-2 shrink-0 no-print">
        <Link to="/orders" className="text-blue-600 hover:underline text-sm self-center">
          ← {t("common.back")}
        </Link>

        <div className="ml-auto flex gap-2">
          <TMButton variant="outline" onClick={handleDevicePrint} loading={devicePrinting} size="sm">
            <Icon name="printer" fontSize={16} />
            <span>{t("orders.printDevice")}</span>
          </TMButton>
          <TMButton variant="outline" onClick={handlePrintTempInvoice} size="sm">
            <Icon name="printer" fontSize={16} />
            <span>{t("orders.printTempInvoice")}</span>
          </TMButton>
          <TMButton variant="outline" onClick={() => setSearchParams({ edit: "1" })} size="sm">
            <Icon name="edit" fontSize={16} />
            <span>{t("orders.editOrder")}</span>
          </TMButton>
          <TMButton onClick={handleCreateInvoice} loading={fetcher.state !== "idle"} size="sm">
            <Icon name="plus" fontSize={16} />
            <span>{t("orders.createInvoice")}</span>
          </TMButton>
        </div>
      </div>

      {/* Printable temp invoice */}
      <CardItem
        title={
          <span className="no-print">
            {t("orders.detailTitle")} {order?.code || ""}
          </span>
        }
        className="p-6 overflow-auto invoice-print"
      >
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex justify-between items-start flex-wrap gap-2">
            <div>
              <p className="text-lg font-bold">{order?.code || `#${order?.id}`}</p>
              <p className="text-sm text-gray-500">{new Date(order?.createdAt).toLocaleString("vi-VN")}</p>
            </div>
            <span className="px-3 py-1 rounded text-sm bg-gray-100 text-gray-800">
              {order?.paymentType === "transfer" ? t("invoices.detail.transfer") : t("invoices.detail.cash")}
            </span>
          </div>

          {/* Items */}
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
                {items.map((item: any, index: number) => (
                  <tr key={`${item.id}-${index}`} className="border-t">
                    <td className="p-2">{item.name || `#${item.productId}`}</td>
                    <td className="p-2 text-right">{item.quantity}</td>
                    <td className="p-2 text-right">{formatCurrency(item.price)}</td>
                    <td className="p-2 text-right">{formatCurrency(item.buyPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between">
                <span>{t("invoices.detail.subtotalLabel")}</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("invoices.detail.surcharge")}</span>
                <span className="font-medium">{formatCurrency(order?.surcharge || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>
                  {t("importOrder.VAT")} ({Number(order?.VAT || 0)}%)
                </span>
                <span className="font-medium">{formatCurrency(vatAmount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>{t("importOrder.totalPayable")}</span>
                <span className="text-blue-600">{formatCurrency(totalPaid)}</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center">{t("orders.tempInvoiceNotice")}</p>
        </div>
      </CardItem>
    </div>
  );
}

export function ErrorBoundary() {
  return <ErrorComponent />;
}

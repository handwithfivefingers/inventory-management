import { ActionFunctionArgs, LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { Link, useFetcher, useNavigate, useLoaderData } from "@remix-run/react";
import { useState, useEffect } from "react";
import { invoiceService } from "~/action.server/invoice.service";
import { customerService } from "~/action.server/customer.service";
import { productService } from "~/action.server/products.service";
import { CardItem } from "~/components/card-item";
import { TMButton } from "~/components/tm-button";
import { getSession } from "~/sessions";
import { IInvoiceItem, PaymentType } from "~/types/invoice";
import { IProduct } from "~/types/product";
import { ICustomer } from "~/types/customer";
import { formatCurrency } from "~/libs/format-currency";
import { useTranslation } from "~/i18n";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const cookie = request.headers.get("cookie") as string;

  const [invoiceResp, customersResp, productsResp] = await Promise.all([
    invoiceService.getInvoiceById({ id: params.id as string, cookie }),
    customerService.getCustomers({ cookie, pageSize: "100" }),
    productService.getProducts({ cookie, pageSize: "100" }),
  ]);

  return {
    invoice: (invoiceResp.data as any)?.data ?? invoiceResp.data,
    customers: customersResp.data?.data ?? [],
    products: productsResp.data?.data ?? [],
  };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const cookie = request.headers.get("cookie") as string;
  const data = await request.json();

  try {
    await invoiceService.updateInvoice({ id: Number(params.id), cookie, ...data });
    return { ok: true };
  } catch (error: any) {
    return { error: error.message || "Cập nhật hóa đơn thất bại" };
  }
};

export const meta: MetaFunction = () => {
  return [{ title: "Chỉnh sửa hóa đơn" }, { name: "description", content: "Chỉnh sửa hóa đơn" }];
};

export default function EditInvoice() {
  const navigate = useNavigate();
  const fetcher = useFetcher<typeof action>();
  const { t } = useTranslation();
  const { invoice, customers, products } = useLoaderData<typeof loader>();

  const [items, setItems] = useState<IInvoiceItem[]>(
    (invoice.invoiceDetails || []).map((detail: any) => ({
      productId: detail.productId || 0,
      quantity: detail.quantity,
      unitPrice: Number(detail.unitPrice),
      discount: Number(detail.discount) || 0,
      taxRate: Number(detail.taxRate) || 0,
    })),
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(invoice.customerId || 0);
  const [paymentType, setPaymentType] = useState<PaymentType>(invoice.paymentType);
  const [discount, setDiscount] = useState(Number(invoice.discount) || 0);
  const [surcharge, setSurcharge] = useState(Number(invoice.surcharge) || 0);
  const [notes, setNotes] = useState(invoice.notes || "");

  const calculateTotals = () => {
    let subtotal = 0;
    let taxAmount = 0;

    items.forEach((item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      subtotal += itemSubtotal;
      taxAmount += (itemSubtotal * (item.taxRate || 0)) / 100;
    });

    return { subtotal, taxAmount };
  };

  const { subtotal, taxAmount } = calculateTotals();

  const handleAddItem = () => {
    setItems([...items, { productId: 0, quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof IInvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-fill price when product selected
    if (field === "productId") {
      const product = products.find((p: IProduct) => p.id === Number(value));
      if (product) {
        newItems[index].unitPrice = product.salePrice || 0;
      }
    }

    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId) {
      alert(t("invoices.detail.selectCustomer"));
      return;
    }

    const validItems = items.filter((item) => item.productId > 0);
    if (validItems.length === 0) {
      alert(t("invoices.detail.selectProduct"));
      return;
    }

    fetcher.submit(
      {
        customerId: selectedCustomerId,
        items: validItems,
        discount,
        surcharge,
        paymentType,
        notes,
      } as any,
      { method: "post", encType: "application/json" },
    );
  };

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data && "ok" in (fetcher.data as any)) {
      navigate(`/invoices/${invoice.id}`);
    }
  }, [fetcher.state, fetcher.data, invoice.id, navigate]);

  return (
    <div className="w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem title={`${t("invoices.editTitle")} - ${invoice.invoiceNumber}`} className="p-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Customer & payment */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t("invoices.customer")} *</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value={0}>-- {t("common.choose")} --</option>
                {customers.map((c: ICustomer) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t("invoices.detail.paymentType")}</label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="cash">{t("invoices.detail.cash")}</option>
                <option value="transfer">{t("invoices.detail.transfer")}</option>
                <option value="credit">{t("invoices.detail.credit")}</option>
              </select>
            </div>
          </div>

          {/* Invoice Items */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">{t("invoices.detail.product")}</label>
              <TMButton type="button" variant="outline" onClick={handleAddItem}>
                + {t("invoices.detail.product")}
              </TMButton>
            </div>

            <div className="border rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">{t("invoices.detail.product")}</th>
                    <th className="p-2 w-24">{t("invoices.detail.quantity")}</th>
                    <th className="p-2 w-32">{t("invoices.detail.unitPrice")}</th>
                    <th className="p-2 w-24">{t("invoices.detail.taxRate")}</th>
                    <th className="p-2 w-32">{t("invoices.detail.amount")}</th>
                    <th className="p-2 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const itemTotal =
                      item.quantity * item.unitPrice * (1 + (item.taxRate || 0) / 100);
                    return (
                      <tr key={index} className="border-t">
                        <td className="p-2">
                          <select
                            value={item.productId}
                            onChange={(e) =>
                              handleItemChange(index, "productId", Number(e.target.value))
                            }
                            className="w-full border rounded px-2 py-1"
                          >
                            <option value={0}>-- {t("common.choose")} --</option>
                            {products.map((p: IProduct) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(index, "quantity", Number(e.target.value))
                            }
                            className="w-full border rounded px-2 py-1"
                            min="1"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleItemChange(index, "unitPrice", Number(e.target.value))
                            }
                            className="w-full border rounded px-2 py-1"
                            min="0"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={item.taxRate}
                            onChange={(e) =>
                              handleItemChange(index, "taxRate", Number(e.target.value))
                            }
                            className="w-full border rounded px-2 py-1"
                            min="0"
                            max="100"
                          />
                        </td>
                        <td className="p-2 text-right">{formatCurrency(itemTotal)}</td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between">
                <span>{t("invoices.detail.subtotalLabel")}:</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("invoices.detail.tax")}:</span>
                <span className="font-medium">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>{t("invoices.detail.discount")}:</span>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-24 border rounded px-2 py-1 text-right"
                  min="0"
                />
              </div>
              <div className="flex justify-between items-center">
                <span>{t("invoices.detail.surcharge")}:</span>
                <input
                  type="number"
                  value={surcharge}
                  onChange={(e) => setSurcharge(Number(e.target.value))}
                  className="w-24 border rounded px-2 py-1 text-right"
                  min="0"
                />
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>{t("invoices.total")}:</span>
                <span className="text-blue-600">{formatCurrency(subtotal - discount + taxAmount + surcharge)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1">{t("invoices.detail.notes")}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded px-3 py-2"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4 border-t no-print">
            <Link to={`/invoices/${invoice.id}`}>
              <TMButton variant="outline" type="button">
                {t("common.cancel")}
              </TMButton>
            </Link>
            <TMButton type="submit" disabled={fetcher.state !== "idle"}>
              {fetcher.state !== "idle" ? t("invoices.saving") : t("common.save")}
            </TMButton>
          </div>
        </form>
      </CardItem>
    </div>
  );
}

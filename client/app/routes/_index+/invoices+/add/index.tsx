import { ActionFunctionArgs, LoaderFunctionArgs, redirect } from "@remix-run/node";
import { Form, Link, useNavigate, useLoaderData } from "@remix-run/react";
import { useState, useEffect } from "react";
import { invoiceService } from "~/action.client/invoice.service";
import { customerService } from "~/action.client/customer.service";
import { productService } from "~/action.client/products.service";
import { CardItem } from "~/components/card-item";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { getSession } from "~/sessions";
import { IInvoiceItem } from "~/types/invoice";
import { IProduct } from "~/types/product";
import { ICustomer } from "~/types/customer";
import { formatCurrency } from "~/libs/format-currency";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const cookie = request.headers.get("cookie") as string;
  
  const [customersResp, productsResp] = await Promise.all([
    customerService.getCustomers({ cookie, pageSize: "100" } as any),
    productService.getProducts({ cookie, pageSize: "100" } as any),
  ]);

  return {
    customers: customersResp.data || [],
    products: productsResp.data || [],
  };
};

export default function AddInvoice() {
  const navigate = useNavigate();
  const { customers, products } = useLoaderData<typeof loader>();
  const [items, setItems] = useState<IInvoiceItem[]>([
    { productId: 0, quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 },
  ]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(0);
  const [paymentType, setPaymentType] = useState<"cash" | "transfer">("cash");
  const [discount, setDiscount] = useState(0);
  const [surcharge, setSurcharge] = useState(0);
  const [notes, setNotes] = useState("");

  const calculateTotals = () => {
    let subtotal = 0;
    let taxAmount = 0;

    items.forEach((item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemTax = (itemSubtotal * (item.taxRate || 0)) / 100;
      subtotal += itemSubtotal;
      taxAmount += itemTax;
    });

    const total = subtotal - discount + taxAmount + surcharge;
    return { subtotal, taxAmount, total };
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  const handleAddItem = () => {
    setItems([...items, { productId: 0, quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!selectedCustomerId) {
      alert("Vui lòng chọn khách hàng");
      return;
    }

    const validItems = items.filter((item) => item.productId > 0);
    if (validItems.length === 0) {
      alert("Vui lòng thêm ít nhất 1 sản phẩm");
      return;
    }

    try {
      await invoiceService.createInvoice({
        customerId: selectedCustomerId,
        items: validItems,
        discount,
        surcharge,
        paymentType,
        status: "draft",
        notes,
      });
      navigate("/invoices");
    } catch (error: any) {
      alert(error.message || "Tạo hóa đơn thất bại");
    }
  };

  return (
    <div className="w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem title="Tạo hóa đơn mới" className="p-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Customer Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Khách hàng *</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value={0}>-- Chọn khách hàng --</option>
                {customers.map((c: ICustomer) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Phương thức thanh toán</label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as any)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="cash">Tiền mặt</option>
                <option value="transfer">Chuyển khoản</option>
                <option value="credit">Tín dụng</option>
              </select>
            </div>
          </div>

          {/* Invoice Items */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">Sản phẩm</label>
              <TMButton type="button" variant="outline" onClick={handleAddItem}>
                + Thêm sản phẩm
              </TMButton>
            </div>

            <div className="border rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Sản phẩm</th>
                    <th className="p-2 w-24">Số lượng</th>
                    <th className="p-2 w-32">Đơn giá</th>
                    <th className="p-2 w-24">Thuế %</th>
                    <th className="p-2 w-32">Thành tiền</th>
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
                            <option value={0}>-- Chọn sản phẩm --</option>
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
                        <td className="p-2">{formatCurrency(itemTotal)}</td>
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
                <span>Tạm tính:</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Thuế:</span>
                <span className="font-medium">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Giảm giá:</span>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-24 border rounded px-2 py-1 text-right"
                  min="0"
                />
              </div>
              <div className="flex justify-between items-center">
                <span>Phụ thu:</span>
                <input
                  type="number"
                  value={surcharge}
                  onChange={(e) => setSurcharge(Number(e.target.value))}
                  className="w-24 border rounded px-2 py-1 text-right"
                  min="0"
                />
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Tổng cộng:</span>
                <span className="text-blue-600">{formatCurrency(total - discount + surcharge)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1">Ghi chú</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded px-3 py-2"
              rows={3}
              placeholder="Ghi chú thêm..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Link to="/invoices">
              <TMButton variant="outline" type="button">
                Hủy
              </TMButton>
            </Link>
            <TMButton type="submit">Tạo hóa đơn</TMButton>
          </div>
        </form>
      </CardItem>
    </div>
  );
}

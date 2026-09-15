import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { LoaderFunctionArgs } from "@remix-run/node";
import { Link, useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { useState } from "react";
import { orderService } from "~/action.server/order.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { NumberInput } from "~/components/form/number-input";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { toast } from "~/components/notification";
import { TMButton } from "~/components/tm-button";
import { useSubmitPromise } from "~/hooks";
import { useTranslation } from "~/i18n";
import { formatCurrency } from "~/libs/format-currency";
import { parseCookieFromRequest } from "~/sessions";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { id } = params;
  const { cookie, warehouseId, vendorId } = await parseCookieFromRequest(request);
  if (!id) throw new Error("Không tìm thấy đơn hàng");
  const response = await orderService.getOrderById({ id, cookie, warehouseId, vendorId });
  return response.data;
};

export const meta: MetaFunction = () => {
  return [{ title: "Trả hàng" }, { name: "description", content: "Tạo phiếu trả hàng cho đơn hàng" }];
};

/**
 * Order return flow: pick quantities per line (default 0), optional reason,
 * submit POST /orders/:id/return. The backend restores stock, decrements
 * sold, books the refund voucher and updates order status.
 */
export default function OrderReturnPage() {
  const loaderData = useLoaderData<typeof loader>();
  const order: any = (loaderData as any)?.data ?? loaderData;
  const navigate = useNavigate();
  const { t } = useTranslation();
  // const fetcher = useFetcher<{ success?: boolean; error?: string }>({ key: "order-return" });
  const { submit, isLoading } = useSubmitPromise();
  const items: any[] = order?.orderDetails || [];
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [reason, setReason] = useState("");

  const selectedLines = items
    .map((item) => ({ item, qty: Number(quantities[item.id]) || 0 }))
    .filter(({ qty }) => qty > 0);

  const refundTotal = selectedLines.reduce((sum, { item, qty }) => sum + Number(item.price || 0) * qty, 0);
  // const busy = fetcher.state !== "idle";

  const handleSubmit = () => {
    if (!selectedLines.length) return;
    submit(
      {
        data: JSON.stringify({
          items: selectedLines.map(({ item, qty }) => ({ orderDetailId: item.id, quantity: qty })),
          reason: reason.trim() || undefined,
        }),
      },
      { method: "POST" },
    );
  };

  // if (fetcher.state === "idle" && fetcher.data?.success) {
  //   toast.success({ title: "Thành công", message: "Đã tạo phiếu trả hàng" });
  //   navigate(`/orders/${order?.id}`);
  // }

  return (
    <div className="w-full flex flex-col p-3 gap-3 overflow-auto h-full bg-slate-50/50 dark:bg-transparent">
      <div className="max-w-3xl w-full mx-auto flex flex-col gap-3">
        <CardItem
          title={
            <div className="flex gap-3">
              <div className="hidden sm:flex w-10 h-10 rounded-xl bg-red-50 dark:bg-slate-700 items-center justify-center text-danger dark:text-slate-200 shrink-0">
                <Icon name="corner-up-left" fontSize={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">
                  Trả hàng — {order?.code || `#${order?.id}`}
                </h2>
                <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                  Chọn số lượng cần trả cho từng sản phẩm. Hàng sẽ được nhập lại kho và tạo phiếu chi hoàn tiền.
                </p>
              </div>
            </div>
          }
          className="p-5 sm:p-6"
        >
          <div className="flex flex-col gap-4">
            {/* Lines */}
            <div className="flex flex-col gap-2">
              {items.map((item) => {
                const qty = Number(quantities[item.id]) || 0;
                const bought = Number(item.quantity);
                return (
                  <div
                    key={item.id}
                    className="flex flex-wrap gap-3 items-center border border-slate-200 dark:border-slate-600 rounded p-2"
                  >
                    <div className="flex-1 min-w-0 basis-full sm:basis-auto">
                      <div className="text-sm font-medium truncate">{item.name || `#${item.productId}`}</div>
                      {item.variant?.attributeValues?.length ? (
                        <div className="text-xs text-slate-500 truncate">
                          {item.variant.attributeValues
                            .map((attr: any) => `${attr.attribute?.name}: ${attr.value}`)
                            .join(", ")}
                        </div>
                      ) : null}
                      <div className="text-xs text-slate-400">
                        Đã mua: {bought} × {formatCurrency(item.price)}
                      </div>
                    </div>
                    <div className="w-32 shrink-0">
                      <NumberInput
                        value={`${qty}`}
                        min={0}
                        max={bought}
                        onValueChange={(v: any) =>
                          setQuantities((prev) => ({
                            ...prev,
                            [item.id]: Math.min(Math.max(0, Number(v.value) || 0), bought),
                          }))
                        }
                      />
                    </div>
                    <div className="w-28 text-right text-sm shrink-0 ml-auto sm:ml-0">
                      {formatCurrency(qty * Number(item.price || 0))}
                    </div>
                  </div>
                );
              })}
              {items.length === 0 && <p className="text-sm text-slate-400">Đơn hàng không có sản phẩm nào.</p>}
            </div>

            {/* Reason */}
            <TextInput
              label="Lý do trả (không bắt buộc)"
              placeholder="VD: Khách đổi ý, hàng lỗi..."
              value={reason}
              onChange={(e: any) => setReason(e.target.value)}
            />

            {/* Summary */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 border-t border-slate-100 dark:border-slate-700 pt-3">
              <span className="text-sm text-slate-500">
                Số dòng trả: <b>{selectedLines.length}</b>
              </span>
              <span className="text-sm">
                Tổng hoàn tiền: <b className="text-danger">{formatCurrency(refundTotal)}</b>
              </span>
            </div>

            {/* {fetcher.data?.error && <p className="text-sm text-red-500">{fetcher.data.error}</p>} */}

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
              <TMButton variant="ghost" size="sm" as={Link} to={`/orders/${order?.id}`}>
                {t("common.cancel")}
              </TMButton>
              <TMButton
                type="submit"
                variant="outline"
                size="sm"
                disabled={selectedLines.length === 0 || isLoading}
                loading={isLoading}
                onClick={handleSubmit}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <Icon name="corner-up-left" fontSize={16} />
                Xác nhận trả hàng
              </TMButton>
            </div>
          </div>
        </CardItem>
      </div>
    </div>
  );
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { id } = params;
  const { cookie, vendorId } = await parseCookieFromRequest(request);
  try {
    const formData = await request.formData();
    const data = JSON.parse((formData.get("data") as string) || "{}");
    const resp = await orderService.returnOrder({
      id: id as string,
      cookie,
      vendorId,
      items: data.items || [],
      reason: data.reason,
    });
    if (resp.status !== 200) throw new Error((resp as any)?.error || "Trả hàng thất bại");
    return Response.json({ success: true });
  } catch (error: any) {
    return Response.json({ success: false, error: error?.message || "Trả hàng thất bại" }, { status: 400 });
  }
};

export function ErrorBoundary() {
  return <ErrorComponent />;
}

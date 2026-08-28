import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Link, useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { useEffect } from "react";
import { invoiceService } from "~/action.server/invoice.service";
import { orderService } from "~/action.server/order.service";
import { CardItem } from "~/components/card-item";
import { TMButton } from "~/components/tm-button";
import { TMPagination } from "~/components/tm-pagination";
import { TMTable } from "~/components/tm-table";
import { parseCookieFromRequest } from "~/sessions";
import { formatCurrency } from "~/libs/format-currency";
import { useTranslation } from "~/i18n";

/**
 * Invoices can only be created FROM an order (enforced by the backend).
 * This page lists orders so the user can pick one to invoice.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { cookie, warehouseId, vendorId } = await parseCookieFromRequest(request);
  const url = new URL(request.url);
  const params = url.searchParams;
  const page = params.get("page") || "1";

  const resp = await orderService.getOrders({
    cookie,
    warehouseId,
    vendorId,
    page,
    pageSize: "10",
  });

  return {
    data: resp.data?.data ?? [],
    total: resp.data?.total ?? 0,
    page: Number(page),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { cookie, warehouseId, vendorId } = await parseCookieFromRequest(request);
  const formData = await request.formData();
  const orderId = Number(formData.get("orderId"));

  try {
    const resp: any = await invoiceService.createInvoice({
      orderId,
      status: "draft", // starts as a temp invoice
      cookie,
      vendorId,
      ...(warehouseId ? { warehouseId: Number(warehouseId) } : {}),
    });
    return { invoiceId: resp?.data?.data?.id ?? resp?.data?.id };
  } catch (error: any) {
    return { error: error.message || "Tạo hóa đơn thất bại" };
  }
};

export default function CreateInvoiceFromOrder() {
  const fetcher = useFetcher<typeof action>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data, total, page } = useLoaderData<typeof loader>();

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data && !("error" in (fetcher.data as any))) {
      const result: any = fetcher.data;
      if (result.invoiceId) {
        navigate(`/invoices/${result.invoiceId}`);
      }
    }
  }, [fetcher.state, fetcher.data, navigate]);

  return (
    <div className="w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem title={t("orders.selectOrderForInvoice")} className="p-4 h-full">
        <div className="flex flex-col gap-4 h-full overflow-hidden">
          <div className="flex gap-2 shrink-0 justify-between items-center">
            <Link to="/invoices" className="text-blue-600 hover:underline text-sm">
              ← {t("common.back")}
            </Link>
          </div>

          {(fetcher.data as any)?.error && (
            <p className="text-red-600 text-sm">{(fetcher.data as any).error}</p>
          )}

          <div className="flex-1 overflow-auto">
            <TMTable
              columns={[
                { title: "#", dataIndex: "id", width: 60 },
                { title: t("orders.code"), dataIndex: "code", width: 150, render: (order: any) => order.code || `#${order.id}` },
                { title: t("common.createdAt"), dataIndex: "createdAt", width: 180, render: (order: any) => new Date(order.createdAt).toLocaleString("vi-VN") },
                {
                  title: t("importOrder.quantity"),
                  dataIndex: "quantity",
                  width: 100,
                  render: (order: any) =>
                    (order.orderDetails || []).reduce((sum: number, d: any) => sum + Number(d.quantity || 0), 0),
                },
                { title: t("invoices.total"), dataIndex: "price", width: 130, render: (order: any) => formatCurrency(order.price) },
                {
                  title: t("common.actions"),
                  dataIndex: "actions",
                  width: 160,
                  render: (order: any) => (
                    <TMButton
                      size="xs"
                      disabled={fetcher.state !== "idle"}
                      onClick={() => fetcher.submit({ orderId: String(order.id) }, { method: "post" })}
                    >
                      🧾 {t("orders.createInvoice")}
                    </TMButton>
                  ),
                },
              ]}
              data={data || []}
              rowKey="id"
            />
          </div>

          <div className="shrink-0">
            <TMPagination
              total={total || 0}
              page={page}
              pageSize={10}
              onChange={(nextPage) => navigate(`?page=${nextPage}`)}
            />
          </div>
        </div>
      </CardItem>
    </div>
  );
}

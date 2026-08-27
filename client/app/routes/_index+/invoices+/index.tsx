import { ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { Link, useFetcher, useLoaderData, useNavigate, useRouteError } from "@remix-run/react";
import { useEffect, useState } from "react";
import { invoiceService } from "~/action.server/invoice.service";
import { CardItem } from "~/components/card-item";
import { SelectInput } from "~/components/form/select-input";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { PermissionGuard } from "~/components/permission-guard";
import { TMButton } from "~/components/tm-button";
import { TMPagination } from "~/components/tm-pagination";
import { TMTable } from "~/components/tm-table";
import { useTranslation } from "~/i18n";
import { formatCurrency } from "~/libs/format-currency";
import { parseCookieFromRequest } from "~/sessions";
import { IInvoice } from "~/types/invoice";

interface IFilter {
  s?: string;
  status?: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  issued: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { cookie, vendorId } = await parseCookieFromRequest(request);
  const url = new URL(request.url);
  const params = url.searchParams;
  const page = params.get("page") || "1";
  const pageSize = params.get("pageSize") || "10";
  const search = params.get("s") || "";
  const status = params.get("status") || "";

  const resp = await invoiceService.getInvoices({
    vendorId,
    page,
    pageSize,
    search,
    status,
    cookie,
  } as any);

  return {
    data: resp.data?.data ?? [],
    total: resp.data?.total ?? 0,
    s: search,
    status,
    page: Number(page),
    pageSize: Number(pageSize),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const cookie = request.headers.get("cookie") as string;
  const formData = await request.formData();
  const id = Number(formData.get("id"));
  const intent = formData.get("intent");

  try {
    if (intent === "update-status") {
      await invoiceService.updateInvoiceStatus({
        id,
        status: formData.get("status") as any,
        cookie,
      });
    } else {
      await invoiceService.deleteInvoice({ id, cookie });
    }
    return new Response(null, { status: 200 });
  } catch (error: any) {
    return { error: error.message || "Request failed" };
  }
};

export const meta: MetaFunction = () => {
  return [{ title: "Hóa đơn" }, { name: "description", content: "Quản lý hóa đơn" }];
};

export default function Invoices() {
  const navigate = useNavigate();
  const { data, total, page, pageSize, s, status } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const { t } = useTranslation();
  const [filter, setFilter] = useState<IFilter>({ s, status });

  useEffect(() => {
    let timeout: any;
    timeout = setTimeout(() => {
      const params = new URLSearchParams();
      if (filter.s) params.set("s", filter.s);
      if (filter.status) params.set("status", filter.status);
      navigate(`?${params.toString()}`);
    }, 500);
    return () => timeout && clearTimeout(timeout);
  }, [filter]);

  const handleDelete = (id: number) => {
    if (!confirm(t("common.confirmDelete"))) {
      return;
    }
    fetcher.submit({ id: String(id), intent: "delete" }, { method: "post" });
  };

  const handleUpdateStatus = (id: number, newStatus: string) => {
    fetcher.submit({ id: String(id), intent: "update-status", status: newStatus }, { method: "post" });
  };

  return (
    <div className="w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem title={t("invoices.title")} className="p-4 h-full">
        <div className="flex gap-2 flex-col h-full overflow-hidden">
          <div className="flex gap-2 shrink-0 justify-between items-center flex-wrap">
            <div className="flex gap-2 items-center p-1">
              <TextInput
                placeholder={t("invoices.searchPlaceholder")}
                value={filter.s}
                onChange={(v: any) => {
                  setFilter({ ...filter, s: v.target.value });
                }}
                className="max-w-xs"
              />

              <div className="max-w-40">
                <SelectInput
                  options={[
                    { label: t("invoices.allStatuses"), value: "" },
                    { label: t("invoices.status.draft"), value: "draft" },
                    { label: t("invoices.status.issued"), value: "issued" },
                    { label: t("invoices.status.paid"), value: "paid" },
                    { label: t("invoices.status.cancelled"), value: "cancelled" },
                  ]}
                  value={filter.status}
                  onChange={(v: any) => {
                    setFilter({ ...filter, status: v.target.value });
                  }}
                />
              </div>

              {/* <select
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="">{t("invoices.allStatuses")}</option>
                <option value="draft">{t("invoices.status.draft")}</option>
                <option value="issued">{t("invoices.status.issued")}</option>
                <option value="paid">{t("invoices.status.paid")}</option>
                <option value="cancelled">{t("invoices.status.cancelled")}</option>
              </select> */}
            </div>
            <PermissionGuard permission="C" module="invoice" requireAdmin>
              <TMButton component={Link} to={"./add"} size="sm">
                <Icon name="plus" fontSize={16} />
                {t("invoices.create")}
              </TMButton>
              {/* <PermissionGuard permission="C" module="invoice" requireAdmin>
              <Link to="add"> */}
              {/* <TMButton>{t("invoices.create")}</TMButton> */}
              {/* </Link> */}
            </PermissionGuard>
          </div>

          <div className="flex-1 overflow-auto">
            <TMTable
              columns={[
                { title: t("invoices.invoiceNumber"), dataIndex: "invoiceNumber", width: 150 },
                {
                  title: t("invoices.customer"),
                  dataIndex: "customerName",
                  width: 200,
                  render: (item: IInvoice) => item.customer?.name || "-",
                },
                {
                  title: t("invoices.total"),
                  dataIndex: "total",
                  width: 120,
                  render: (item: IInvoice) => formatCurrency(item.total),
                },
                {
                  title: t("invoices.paidAmount"),
                  dataIndex: "paid",
                  width: 120,
                  render: (item: IInvoice) => formatCurrency(item.paid),
                },
                {
                  title: t("invoices.remaining"),
                  dataIndex: "remaining",
                  width: 120,
                  render: (item: IInvoice) => formatCurrency(item.remaining),
                },
                {
                  title: t("invoices.statusLabel"),
                  dataIndex: "status",
                  width: 120,
                  render: (item: IInvoice) => (
                    <span className={`px-2 py-1 rounded text-xs ${STATUS_COLORS[item.status]}`}>
                      {t(`invoices.status.${item.status}`)}
                    </span>
                  ),
                },
                {
                  title: t("common.actions"),
                  dataIndex: "actions",
                  width: 200,
                  render: (item: IInvoice) => (
                    // stopPropagation so clicking an action doesn't also trigger the row navigation
                    <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                      <PermissionGuard permission="R" module="invoice" requireAdmin>
                        <Link
                          to={`${item.id}`}
                          title={t("common.view")}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Icon name="eye" fontSize={16} />
                        </Link>
                      </PermissionGuard>
                      {item.status === "draft" && (
                        <>
                          <PermissionGuard permission="U" module="invoice" requireAdmin>
                            <Link
                              to={`${item.id}/edit`}
                              title={t("common.edit")}
                              className="text-orange-600 hover:text-orange-800"
                            >
                              <Icon name="edit-2" fontSize={16} />
                            </Link>
                          </PermissionGuard>
                          <PermissionGuard permission="D" module="invoice" requireAdmin>
                            <button
                              onClick={() => handleDelete(item.id)}
                              title={t("common.delete")}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Icon name="trash-2" fontSize={16} />
                            </button>
                          </PermissionGuard>
                        </>
                      )}
                      {item.status === "issued" && (
                        <PermissionGuard permission="U" module="invoice" requireAdmin>
                          <button
                            onClick={() => handleUpdateStatus(item.id, "paid")}
                            title={t("invoices.markAsPaid")}
                            className="text-green-600 hover:text-green-800"
                          >
                            <Icon name="check-circle" fontSize={16} />
                          </button>
                        </PermissionGuard>
                      )}
                    </div>
                  ),
                },
              ]}
              data={data || []}
              rowKey="id"
              onRow={{
                onClick: (item) => navigate(`/invoices/${item.id}`),
              }}
            />
          </div>

          <div className="shrink-0">
            <TMPagination
              total={total || 0}
              page={Number(page)}
              pageSize={Number(pageSize)}
              onChange={(page) => {
                const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
                if (filter.s) params.set("s", filter.s);
                if (filter.status) params.set("status", filter.status);
                navigate(`?${params.toString()}`);
              }}
            />
          </div>
        </div>
      </CardItem>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  return <div className="p-4 text-red-600">Lỗi: {(error as any).message}</div>;
}

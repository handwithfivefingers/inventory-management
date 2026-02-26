import { ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { Link, useLoaderData, useNavigate, useRouteError } from "@remix-run/react";
import { useEffect, useState } from "react";
import invoiceService from "~/action.client/invoice.service";
import { CardItem } from "~/components/card-item";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { TMPagination } from "~/components/tm-pagination";
import { TMTable } from "~/components/tm-table";
import { PermissionGuard } from "~/components/permission-guard";
import { getSession } from "~/sessions";
import { IInvoice } from "~/types/invoice";
import { formatCurrency } from "~/libs/format-currency";

interface IFilter {
  s?: string;
  status?: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Nháp",
  issued: "Đã phát hành",
  paid: "Đã thanh toán",
  cancelled: "Đã hủy",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  issued: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const cookie = request.headers.get("cookie") as string;
  const session = await getSession(cookie);
  const vendorId = session.get("vendorId");
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
    ...resp,
    s: search,
    status,
    page,
    pageSize,
  };
};

export const meta: MetaFunction = () => {
  return [{ title: "Hóa đơn" }, { name: "description", content: "Quản lý hóa đơn" }];
};

export default function Invoices() {
  const navigate = useNavigate();
  const { data, total, page, pageSize, s, status } = useLoaderData<typeof loader>();
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

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa hóa đơn này?")) {
      return;
    }
    try {
      await invoiceService.deleteInvoice(id);
      navigate(0);
    } catch (error: any) {
      alert(error.message || "Xóa hóa đơn thất bại");
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      await invoiceService.updateInvoiceStatus({ id, status: newStatus as any });
      navigate(0);
    } catch (error: any) {
      alert(error.message || "Cập nhật trạng thái thất bại");
    }
  };

  return (
    <div className="w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem title="Hóa đơn" className="p-4 h-full">
        <div className="flex gap-2 flex-col h-full overflow-hidden">
          <div className="flex gap-2 shrink-0 justify-between items-center flex-wrap">
            <div className="flex gap-2 items-center">
              <TextInput
                placeholder="Lọc theo số hóa đơn"
                value={filter.s}
                onChange={(v: any) => {
                  setFilter({ ...filter, s: v.target.value });
                }}
                className="max-w-xs"
              />
              <select
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="draft">Nháp</option>
                <option value="issued">Đã phát hành</option>
                <option value="paid">Đã thanh toán</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </div>
            <PermissionGuard permission="C" module="invoice">
              <Link to="add">
                <TMButton>Tạo hóa đơn</TMButton>
              </Link>
            </PermissionGuard>
          </div>

          <div className="flex-1 overflow-auto">
            <TMTable
              columns={[
                { title: "Số hóa đơn", dataIndex: "invoiceNumber", width: 150 },
                { title: "Khách hàng", dataIndex: "customerName", width: 200, render: (item: IInvoice) => item.customer?.name || "-" },
                { title: "Tổng tiền", dataIndex: "total", width: 120, render: (item: IInvoice) => formatCurrency(item.total) },
                { title: "Đã trả", dataIndex: "paid", width: 120, render: (item: IInvoice) => formatCurrency(item.paid) },
                { title: "Còn lại", dataIndex: "remaining", width: 120, render: (item: IInvoice) => formatCurrency(item.remaining) },
                { title: "Trạng thái", dataIndex: "status", width: 120, render: (item: IInvoice) => (
                  <span className={`px-2 py-1 rounded text-xs ${STATUS_COLORS[item.status]}`}>
                    {STATUS_LABELS[item.status]}
                  </span>
                )},
                {
                  title: "Thao tác",
                  dataIndex: "actions",
                  width: 200,
                  render: (item: IInvoice) => (
                    <div className="flex gap-2">
                      <PermissionGuard permission="R" module="invoice">
                        <Link to={`${item.id}`} className="text-blue-600 hover:underline">
                          Xem
                        </Link>
                      </PermissionGuard>
                      {item.status === "draft" && (
                        <>
                          <PermissionGuard permission="U" module="invoice">
                            <Link to={`${item.id}/edit`} className="text-orange-600 hover:underline">
                              Sửa
                            </Link>
                          </PermissionGuard>
                          <PermissionGuard permission="D" module="invoice">
                            <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:underline">
                              Xóa
                            </button>
                          </PermissionGuard>
                        </>
                      )}
                      {item.status === "issued" && (
                        <button onClick={() => handleUpdateStatus(item.id, "paid")} className="text-green-600 hover:underline">
                          Đánh dấu đã trả
                        </button>
                      )}
                    </div>
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

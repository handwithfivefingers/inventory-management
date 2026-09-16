import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { stocktakeService } from "~/action.server/stocktake.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { Icon } from "~/components/icon";
import { toast } from "~/components/notification";
import { TMButton } from "~/components/tm-button";
import { TMPagination } from "~/components/tm-pagination";
import { TMTable } from "~/components/tm-table";
import { MODULE_ENUM } from "~/constants/modules";
import { PermissionGuard } from "~/components/permission-guard";
import { dayjs } from "~/libs/date";
import { parseCookieFromRequest } from "~/sessions";
import { useSubmitPromise } from "~/hooks";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const page = url.searchParams.get("page") || "1";
  const pageSize = url.searchParams.get("pageSize") || "10";
  const resp = await stocktakeService.list({ page, pageSize });
  return {
    data: (resp.data as any)?.data || [],
    total: (resp.data as any)?.total || 0,
    page: Number(page),
    pageSize: Number(pageSize),
  };
}

export const meta: MetaFunction = () => {
  return [{ title: "Đồng kiểm kho" }, { name: "description", content: "Kiểm kê tồn kho thực tế" }];
};

const STATUS_BADGE: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-slate-100 text-slate-600",
};
const STATUS_LABEL: Record<string, string> = {
  open: "Đang kiểm",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
};

export default function StocktakeList() {
  const { data, total, page, pageSize } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { submit, isLoading } = useSubmitPromise();
  //   const fetcher = useFetcher<{ success?: boolean; error?: string; message?: string }>({ key: "stocktake-list" });

  //   if (fetcher.state === "idle" && fetcher.data?.message) {
  //     if (fetcher.data.success) toast.success({ title: "Thành công", message: fetcher.data.message });
  //     else toast.danger({ title: "Lỗi", message: fetcher.data.error || fetcher.data.message });
  //   }

  return (
    <div className=" w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem
        title={
          <div className="flex gap-3">
            <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
              <Icon name="clipboard" fontSize={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">Đồng kiểm kho</h2>
              <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                Đối chiếu tồn kho thực tế với số liệu trên hệ thống
              </p>
            </div>
          </div>
        }
        action={
          <PermissionGuard permission="UPDATE" module={MODULE_ENUM.warehouse} requireAdmin>
            <TMButton size="sm" loading={isLoading} onClick={() => submit({ intent: "start" }, { method: "POST" })}>
              <Icon name="plus" fontSize={16} />
              <span>Bắt đầu kiểm kho</span>
            </TMButton>
          </PermissionGuard>
        }
        className="flex flex-col w-full rounded-md bg-white shadow-2xl shadow-slate-200 gap-2 dark:bg-slate-800 dark:shadow-black/20 p-5 sm:p-6 h-full"
      >
        <div className="flex gap-2 flex-col h-full overflow-hidden">
          <div className="flex gap-2 flex-col items-end flex-1 overflow-auto">
            <TMTable
              loading={isLoading}
              scrollable
              columns={[
                { title: "Mã phiên", dataIndex: "code" },
                {
                  title: "Trạng thái",
                  dataIndex: "status",
                  render: (record) => (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${STATUS_BADGE[record.status] || "bg-slate-100"}`}
                    >
                      {STATUS_LABEL[record.status] || record.status}
                    </span>
                  ),
                },
                {
                  title: "Số dòng kiểm",
                  dataIndex: "stocktakeDetails",
                  render: (record) => (record.stocktakeDetails || record.details || []).length,
                },
                { title: "Ghi chú", dataIndex: "note", render: (r: any) => r.note || "—" },
                {
                  title: "Ngày tạo",
                  dataIndex: "createdAt",
                  render: (record) => dayjs(record.createdAt).format("DD/MM/YYYY HH:mm"),
                },
                {
                  title: "",
                  dataIndex: "actions",
                  width: 180,
                  render: (record: any) =>
                    record.status === "open" ? (
                      <div className="flex gap-1">
                        <TMButton as={Link} variant="light" size="xs" to={`./${record.id}`}>
                          Kiểm kê
                        </TMButton>
                        <TMButton
                          size="xs"
                          variant="ghost"
                          onClick={(e: any) => {
                            e.stopPropagation();
                            submit({ intent: "cancel", id: String(record.id) }, { method: "POST" });
                          }}
                        >
                          Hủy
                        </TMButton>
                      </div>
                    ) : (
                      <TMButton as={Link} size="xs" to={`./${record.id}`}>
                        Xem
                      </TMButton>
                    ),
                },
              ]}
              data={data as any[]}
              rowKey="id"
              onRow={{ onClick: (record: any) => navigate(`./${record.id}`) }}
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <TMPagination
              total={total || 0}
              current={page}
              pageSize={pageSize}
              onPageChange={(page: number) => navigate(`?page=${page}&pageSize=${pageSize}`)}
            />
          </div>
        </div>
      </CardItem>
    </div>
  );
}

export async function action({ request, context: { warehouseId } }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  try {
    if (intent === "start") {
      await stocktakeService.start({ warehouseId: Number(warehouseId) });
      return Response.json({ success: true, message: "Đã mở phiên kiểm kho" });
    }
    if (intent === "cancel") {
      const id = formData.get("id");
      await stocktakeService.cancel(id as string);
      return Response.json({ success: true, message: "Đã hủy phiên kiểm kho" });
    }
    return Response.json({ success: false, message: "Hành động không hợp lệ" }, { status: 400 });
  } catch (error: any) {
    return Response.json({ success: false, error: error?.message || "Thất bại" }, { status: 400 });
  }
}

export function ErrorBoundary() {
  return <ErrorComponent />;
}

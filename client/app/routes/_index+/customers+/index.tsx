import { ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { Link, useFetcher, useLoaderData, useNavigate, useRouteError } from "@remix-run/react";
import { useEffect, useState } from "react";
import { customerService } from "~/action.server/customer.service";
import { CardItem } from "~/components/card-item";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { TMPagination } from "~/components/tm-pagination";
import { TMTable } from "~/components/tm-table";
import { PermissionGuard } from "~/components/permission-guard";
import { getSession } from "~/sessions";
import { ICustomer } from "~/types/customer";
import { useTranslation } from "~/i18n";
import { Icon } from "~/components/icon";

interface IFilter {
  s?: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { cookie, vendorId } = await import("~/sessions").then((m) => m.parseCookieFromRequest(request));
  const url = new URL(request.url);
  const params = url.searchParams;
  const page = params.get("page") || "1";
  const pageSize = params.get("pageSize") || "10";
  const search = params.get("s") || "";

  const resp = await customerService.getCustomers({
    vendorId,
    page,
    pageSize,
    search,
    cookie,
  } as any);

  return {
    data: resp.data?.data ?? [],
    total: resp.data?.total ?? 0,
    s: search,
    page: Number(page),
    pageSize: Number(pageSize),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { cookie, vendorId } = await import("~/sessions").then((m) => m.parseCookieFromRequest(request));
  const formData = await request.formData();
  const id = Number(formData.get("id"));

  try {
    await customerService.deleteCustomer({ id, cookie, vendorId });
    return new Response(null, { status: 200 });
  } catch (error: any) {
    return { error: error.message || "Delete failed" };
  }
};

export const meta: MetaFunction = () => {
  return [{ title: "Khách hàng" }, { name: "description", content: "Quản lý khách hàng" }];
};

export default function Customers() {
  const navigate = useNavigate();
  const { data, total, page, pageSize, s } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const { t } = useTranslation();
  const [filter, setFilter] = useState<IFilter>({ s });

  useEffect(() => {
    let timeout: any;
    timeout = setTimeout(() => {
      navigate(`?s=${filter.s}`);
    }, 500);
    return () => timeout && clearTimeout(timeout);
  }, [filter]);

  const handleDelete = (id: number) => {
    if (!confirm(t("common.confirmDelete"))) {
      return;
    }
    fetcher.submit({ id: String(id) }, { method: "post" });
  };

  return (
    <div className="w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem
        title={
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                <Icon name="users" fontSize={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">
                  {t("customers.title")}
                </h2>
                <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                  {t("customers.titleHint", { defaultValue: "Quản lý khách hàng" })}
                </p>
              </div>
            </div>
          </div>
        }
        className="flex flex-col w-full rounded-md dark:bg-slate-500 bg-white shadow-2xl shadow-slate-200 gap-2 dark:shadow-slate-600 p-5 sm:p-6 h-full"
      >
        <div className="flex gap-2 flex-col h-full overflow-hidden">
          <div className="flex gap-2 shrink-0 justify-between items-center p-1">
            <TextInput
              placeholder={t("customers.searchPlaceholder")}
              value={filter.s}
              onChange={(v: any) => {
                const value = v.target.value;
                setFilter({ s: value });
              }}
              className="max-w-sm w-full"
            />
            <PermissionGuard permission="CREATE" module="customer">
              <TMButton component={Link} to="add" size="sm">
                <Icon name="plus" fontSize={16} />
                {t("customers.create")}
              </TMButton>
            </PermissionGuard>
          </div>

          <div className="flex-1 overflow-auto">
            <TMTable
              scrollable
              columns={[
                // { title: t("customers.id"), dataIndex: "id", width: 60 },
                { title: t("customers.name"), dataIndex: "name", width: 200 },
                { title: t("customers.phone"), dataIndex: "phone", width: 150 },
                { title: t("customers.email"), dataIndex: "email" },
                { title: t("customers.taxCode"), dataIndex: "taxCode" },
                {
                  title: t("common.actions"),
                  dataIndex: "actions",
                  width: 120,
                  render: (item: ICustomer) => (
                    <div className="flex gap-1">
                      <PermissionGuard permission="READ" module="customer">
                        <TMButton component={Link} to={`${item.id}`} size="sm" className="py-2">
                          <Icon name="eye" fontSize={12} />
                        </TMButton>
                      </PermissionGuard>
                      <PermissionGuard permission="UPDATE" module="customer">
                        <TMButton component={Link} to={`${item.id}/edit`} size="sm" className="py-2">
                          <Icon name="edit" fontSize={12} />
                        </TMButton>
                      </PermissionGuard>
                      <PermissionGuard permission="DELETE" module="customer">
                        <TMButton
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          className="py-2 text-red-500 bg-red-500/20"
                        >
                          <Icon name="trash" fontSize={12} />
                        </TMButton>
                      </PermissionGuard>
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
              onChange={(page) => navigate(`?page=${page}&pageSize=${pageSize}&s=${filter.s}`)}
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

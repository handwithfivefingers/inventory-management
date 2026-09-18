import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import { withContext } from "~/action.server/context.server";
import { tagsService } from "~/action.server/tags.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { CreateFab } from "~/components/layouts/create-fab";
import { toast } from "~/components/notification";
import PermissionGuard from "~/components/permission-guard";
import { TMButton } from "~/components/tm-button";
import { TMPagination } from "~/components/tm-pagination";
import { TMTable } from "~/components/tm-table";
import { MODULE_ENUM } from "~/constants/modules";
import { useSubmitPromise } from "~/hooks";
import { useTranslation } from "~/i18n";
import { dayjs } from "~/libs/date";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const params = url.searchParams;
  const page = params.get("page") || "1";
  const pageSize = params.get("pageSize") || "10";
  const resp = await tagsService.get({
    page,
    pageSize,
  });
  return {
    data: resp.data?.data ?? [],
    total: resp.data?.total ?? 0,
    page: Number(page),
    pageSize: Number(pageSize),
  };
}

export const meta: MetaFunction = () => {
  return [{ title: "Tags" }];
};
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const id = Number(formData.get("id"));
  try {
    await tagsService.delete(id);
    return new Response(null, { status: 200 });
  } catch (error: any) {
    return { error: error.message || "Delete failed" };
  }
}
export default function Products() {
  const navigate = useNavigate();
  const { data, total, page, pageSize } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const { submit, isLoading } = useSubmitPromise();
  const handleDelete = async (id: number) => {
    try {
      if (!confirm(t("common.confirmDelete"))) {
        return;
      }
      const resp = await submit<{ status: number }>({ id: String(id) }, { method: "post" });
      if (resp.status !== 200) throw resp;
      toast.success({ title: "Created", message: "Xóa thành công" });
    } catch (error) {
      toast.danger({ title: "Error", message: (error as any)?.data?.error || (error as Error).message });
    }
  };
  return (
    <div className=" w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CreateFab to="./add" label={t("common.add")} />
      <CardItem
        title={
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                <Icon name="tag" fontSize={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">{t("tags.title")}</h2>
                <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">{t("tags.titleHint")}</p>
              </div>
            </div>
          </div>
        }
        className="flex flex-col w-full rounded-md bg-white shadow-2xl shadow-slate-200 gap-2 dark:bg-slate-800 dark:shadow-black/20 p-5 sm:p-6 h-full"
      >
        <div className="flex gap-2 flex-col h-full overflow-hidden">
          <div className="flex gap-2 shrink-0 p-1">
            <TextInput placeholder={t("tags.searchPlaceholder")} />
            <div className="ml-auto block my-auto">
              <div className="flex gap-2 flex-wrap flex-row">
                <TMButton component={Link} to="./add" variant="light" size="sm" className="hidden sm:inline-flex">
                  <Icon name="plus" fontSize={16} />
                  {t("common.add")}
                </TMButton>
              </div>
            </div>
          </div>
          <div className="flex flex-1 gap-2 flex-col items-end overflow-hidden">
            <TMTable
              scrollable
              loading={isLoading}
              columns={[
                {
                  title: t("tags.tag"),
                  dataIndex: "name",
                  render: (record) => record["name"],
                },
                {
                  title: t("common.createdAt"),
                  dataIndex: "createdAt",
                  hideOnMobile: true,
                  render: (record) => dayjs(record.createdAt).format("DD/MM/YYYY"),
                },
                {
                  title: t("common.actions"),
                  dataIndex: "actions",
                  width: 40,
                  render: (item) => (
                    <div className="flex gap-1 justify-center">
                      <PermissionGuard permission="DELETE" module={MODULE_ENUM.tag}>
                        <TMButton
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id as number);
                          }}
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
              rowKey={"id"}
              onRow={{
                onClick: (record) => {
                  navigate(`./${record?.id}`);
                },
              }}
            />
          </div>
          <div className="flex  gap-2 shrink-0">
            <TMPagination
              total={total || 0}
              current={page as number}
              pageSize={pageSize as number}
              onPageChange={(page: number) => {
                navigate(`?page=${page}&pageSize=${pageSize}`);
              }}
            />
          </div>
        </div>
      </CardItem>
    </div>
  );
}
export function ErrorBoundary() {
  return <ErrorComponent />;
}

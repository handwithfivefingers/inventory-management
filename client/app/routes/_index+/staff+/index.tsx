import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import { staffService } from "~/action.server/staff.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { toast } from "~/components/notification";
import { PermissionGuard } from "~/components/permission-guard";
import { TMButton } from "~/components/tm-button";
import { TMPagination } from "~/components/tm-pagination";
import { TMTable } from "~/components/tm-table";
import { useSubmitPromise } from "~/hooks";
import { useTranslation } from "~/i18n";
import { parseCookieFromRequest } from "~/sessions";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { cookie, warehouseId } = await parseCookieFromRequest(request);
    const url = new URL(request.url);
    const params = url.searchParams;
    const page = params.get("page") || "1";
    const pageSize = params.get("pageSize") || "10";
    const resp = await staffService.get({
      warehouseId: warehouseId as string,
      page,
      pageSize,
      cookie,
    });
    return {
      data: resp.data?.data ?? [],
      total: resp.data?.total ?? 0,
      page: Number(page),
      pageSize: Number(pageSize),
    };
  } catch (error) {
    throw new Response("error", { status: 404 });
  }
};

export const meta: MetaFunction = () => {
  return [{ title: "Nhân viên" }, { name: "description", content: "Quản lý nhân viên" }];
};

export default function Staff() {
  const { data, total, page, pageSize } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { submit, isLoading } = useSubmitPromise();
  const { t } = useTranslation();
  const onRemove = async (id: number) => {
    if (!id) return;
    const response = await submit<{ status: number; message?: string }>({ staffId: `${id}` }, { method: "POST" });
    console.log("Response", response);
    if (response.status === 200) {
      return toast.success({ message: "Xóa thành công", title: "Thành công" });
    }
    toast.danger({ message: response?.message || "Xóa thất bại", title: "Lỗi" });
  };
  return (
    <div className="w-full flex flex-col p-4 gap-4">
      <CardItem title={t("staff.title")} className="p-4">
        <div className="py-2">
          <div className="flex gap-2">
            <TextInput label="Name" placeholder={t("staff.searchPlaceholder")} />
            <div className="ml-auto block my-auto">
              <PermissionGuard requireAdmin>
                <TMButton component={Link} to={"./add"} size="sm">
                  <Icon name="plus" fontSize={16} />
                  {t("staff.add")}
                </TMButton>
              </PermissionGuard>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-col items-end">
          <TMTable
            scrollable
            loading={isLoading}
            columns={[
              { title: t("staff.stt"), dataIndex: "id", width: 80, render: (record, i) => Number(i) + 1 },
              { title: t("staff.code"), dataIndex: "code" },
              { title: t("staff.fullName"), dataIndex: "fullName" },
              { title: t("staff.phone"), dataIndex: "phone" },
              { title: t("staff.roles"), dataIndex: "roles" },
              {
                title: t("staff.status"),
                dataIndex: "status",
                render: (record) =>
                  record.status === "active" ? (
                    <span className="text-green-500">{t("staff.status")}</span>
                  ) : (
                    <span className="text-red-500">{record.status}</span>
                  ),
              },
              {
                title: t("common.actions"),
                dataIndex: "id",
                render: (record) => (
                  <div className="flex gap-1 justify-center">
                    <TMButton component={Link} to={`./${record.id}`} variant="light" size="sm">
                      {t("common.view")}
                    </TMButton>
                    <TMButton
                      variant="light"
                      size="sm"
                      className="bg-red-500/50 text-white hover:bg-red-500"
                      onClick={() => onRemove(record.id)}
                    >
                      <Icon name="trash" fontSize={12} />
                    </TMButton>
                  </div>
                ),
              },
            ]}
            data={data}
            rowKey="id"
          />
          <div className="flex gap-2">
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

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { cookie } = await parseCookieFromRequest(request);
    const formData = await request.formData();
    const staffId = formData.get("staffId") as string;
    const response = await staffService.remove(staffId, cookie);
    return Response.json(response, { status: 200 });
  } catch (error) {
    return Response.json(error, { status: 400 });
  }
};

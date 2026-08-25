import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import { staffService } from "~/action.server/staff.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { TMPagination } from "~/components/tm-pagination";
import { TMTable } from "~/components/tm-table";
import { PermissionGuard } from "~/components/permission-guard";
import { getSession } from "~/sessions";
import { useTranslation } from "~/i18n";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const cookie = request.headers.get("Cookie") as string;
    const session = await getSession(cookie);
    const warehouseId = session.get("warehouseId");
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
  const { t } = useTranslation();
  return (
    <div className="w-full flex flex-col p-4 gap-4">
      <CardItem title={t("staff.title")} className="p-4">
        <div className="py-2">
          <div className="flex gap-2">
            <TextInput label="Name" placeholder={t("staff.searchPlaceholder")} />
            <div className="ml-auto block my-auto">
              <PermissionGuard requireAdmin>
                <TMButton component={Link} to={"./add"}>
                  {t("staff.add")}
                </TMButton>
              </PermissionGuard>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-col items-end">
          <TMTable
            columns={[
              { title: t("staff.stt"), dataIndex: "id", width: 80, render: (record, i) => Number(i) + 1 },
              { title: t("staff.code"), dataIndex: "code" },
              { title: t("staff.fullName"), dataIndex: "fullName" },
              { title: t("staff.phone"), dataIndex: "phone" },
              { title: t("staff.position"), dataIndex: "position" },
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
                  <TMButton component={Link} to={`./${record.id}`} variant="light" size="xs">
                    {t("common.view")}
                  </TMButton>
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

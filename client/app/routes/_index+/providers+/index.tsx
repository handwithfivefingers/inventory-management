import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import { providerService } from "~/action.server/provider.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { TMPagination } from "~/components/tm-pagination";
import { TMTable } from "~/components/tm-table";
import { dayjs } from "~/libs/date";
import { parseCookieFromRequest } from "~/sessions";
import { IProvider } from "~/types/provider";
import { useTranslation } from "~/i18n";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { cookie, session, vendorId } = await parseCookieFromRequest(request);
  const url = new URL(request.url);
  const params = url.searchParams;
  const page = params.get("page") || "1";
  const pageSize = params.get("pageSize") || "10";
  const response = await providerService.getProviders({
    page,
    pageSize,
    cookie,
    vendor: vendorId as string,
    isProvider: true,
  });
  return {
    data: response.data?.data ?? [],
    total: response.data?.total ?? 0,
    page: Number(page),
    pageSize: Number(pageSize),
  };
};

export const meta: MetaFunction = () => {
  return [{ title: "Nhà cung cấp" }, { name: "description", content: "Quản lý nhà cung cấp" }];
};

export default function Products() {
  const { data, total, page, pageSize } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div className=" w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem title={t("providers.title")} className="p-4 h-full">
        <div className="flex gap-2 flex-col h-full overflow-hidden">
          <div className="flex gap-2">
            <TextInput placeholder={t("providers.searchPlaceholder")} />
            <div className="ml-auto block my-auto">
              <div className="flex gap-2 flex-wrap flex-row">
                <TMButton variant="light" component={Link} to="/providers/add">
                  {t("common.add")}
                </TMButton>
                <TMButton variant="light">{t("common.importExcel")}</TMButton>
                <TMButton variant="light">{t("common.exportExcel")}</TMButton>
                <TMButton variant="light">{t("common.printBarcode")}</TMButton>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-col items-end flex-1">
            <TMTable
              columns={[
                {
                  title: t("providers.name"),
                  dataIndex: "name",
                },
                {
                  title: t("providers.phone"),
                  dataIndex: "phone",
                },
                {
                  title: t("providers.email"),
                  dataIndex: "email",
                },
                {
                  title: t("providers.address"),
                  dataIndex: "address",
                },
                {
                  title: t("common.createdAt"),
                  dataIndex: "createdAt",
                  render: (record) => dayjs(record.createdAt).format("DD/MM/YYYY"),
                },
              ]}
              data={data as IProvider[]}
              rowKey={"documentId"}
              onRow={{
                onClick: (record) => navigate(`./${record.id}`),
              }}
            />
          </div>
          <TMPagination
            total={total || 0}
            current={page as number}
            pageSize={pageSize as number}
            onPageChange={(nextPage) => navigate(`?page=${nextPage}&pageSize=${pageSize}`)}
          />
        </div>
      </CardItem>
    </div>
  );
}
export function ErrorBoundary() {
  return <ErrorComponent />;
}

import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import { unitsService } from "~/action.server/units.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { TMButton } from "~/components/tm-button";
import { TMPagination } from "~/components/tm-pagination";
import { TMTable } from "~/components/tm-table";
import { useTranslation } from "~/i18n";
import { dayjs } from "~/libs/date";
import { parseCookieFromRequest } from "~/sessions";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { cookie, vendorId } = await parseCookieFromRequest(request);

  const url = new URL(request.url);
  const params = url.searchParams;
  const page = params.get("page") || "1";
  const pageSize = params.get("pageSize") || "10";
  const resp = await unitsService.get({
    vendorId: vendorId as string,
    page: page,
    pageSize: pageSize,
    cookie,
  });
  return {
    data: resp.data?.data,
    total: resp.data?.total,
    page: Number(page),
    pageSize: Number(pageSize),
  };
};

export const meta: MetaFunction = () => {
  return [{ title: "New Remix App" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function Products() {
  const navigate = useNavigate();
  const { data, total, page, pageSize } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  return (
    <div className=" w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem
        title={
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                <Icon name="dollar-sign" fontSize={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">{t("units.title")}</h2>
                <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">{t("units.titleHint")}</p>
              </div>
            </div>
          </div>
        }
        className="flex flex-col w-full rounded-md dark:bg-slate-500 bg-white shadow-2xl shadow-slate-200 gap-2 dark:shadow-slate-600 p-5 sm:p-6 h-full"
      >
        <div className="flex gap-2 flex-col h-full overflow-hidden">
          <div className="flex gap-2 shrink-0 p-1">
            <TextInput placeholder={t("units.searchPlaceholder")} />
            <div className="ml-auto block my-auto">
              <div className="flex gap-2 flex-wrap flex-row">
                <TMButton component={Link} to="./add" variant="light" size="sm">
                  <Icon name="plus" fontSize={16} />
                  {t("common.add")}
                </TMButton>
              </div>
            </div>
          </div>
          <div className="flex flex-1 gap-2 flex-col items-end overflow-hidden">
            <TMTable
              scrollable
              columns={[
                {
                  title: t("units.unit"),
                  dataIndex: "name",
                  render: (record) => record["name"],
                },
                {
                  title: t("common.createdAt"),
                  dataIndex: "createdAt",
                  render: (record) => dayjs(record.createdAt).format("DD/MM/YYYY"),
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
          <div className="flex gap-2 shrink-0">
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

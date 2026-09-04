import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import { NumericFormat } from "react-number-format";
import { orderService } from "~/action.server/order.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { TMButton } from "~/components/tm-button";
import { TMPagination } from "~/components/tm-pagination";
import { TMTable } from "~/components/tm-table";
import { useTranslation } from "~/i18n";
import { dayjs } from "~/libs/date";
import { getLoaderRequestQuery } from "~/libs/utils";
import { parseCookieFromRequest } from "~/sessions";
import { IOrder } from "~/types/order";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { warehouseId, vendorId, cookie } = await parseCookieFromRequest(request);
    const { page, pageSize } = getLoaderRequestQuery(request);
    const resp = await orderService.getOrders({ page, pageSize, cookie, warehouseId, vendorId });
    console.log("resp", resp);
    return { ...resp.data, page, pageSize };
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Can't fetch orders");
  }
};

export const meta: MetaFunction = () => {
  return [{ title: "Bán hàng" }, { name: "description", content: "Bán hàng" }];
};

export default function Orders() {
  const { data, total, page, pageSize } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div className=" w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem
        title={
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                <Icon name="shopping-cart" fontSize={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">{t("orders.title")}</h2>
                <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">{t("orders.titleHint")}</p>
              </div>
            </div>
          </div>
        }
        action={
          <div className="ml-auto block my-auto">
            <div className="flex gap-2 flex-wrap flex-row">
              <TMButton component={Link} to={"./add"} size="sm">
                <Icon name="plus" fontSize={16} />
                <span>Thêm</span>
              </TMButton>
              <TMButton component={Link} size="sm">
                <Icon name="file-plus" fontSize={16} />
                <span>Xuất Excel</span>
              </TMButton>
            </div>
          </div>
        }
        className="flex flex-col w-full rounded-md dark:bg-slate-500 bg-white shadow-2xl shadow-slate-200 gap-2 dark:shadow-slate-600 p-5 sm:p-6 h-full"
      >
        <div className="flex gap-2 flex-col h-full overflow-hidden p-1">
          <div className="flex shrink-0 gap-2 ">
            <TextInput placeholder="Lọc theo mã, tên hàng hóa" />
          </div>
          <div className="flex flex-1 gap-2 flex-col items-end overflow-hidden">
            <TMTable
              scrollable
              columns={[
                {
                  title: "STT",
                  dataIndex: "id",
                  width: 80,
                },
                {
                  title: "Tên khách hàng",
                  dataIndex: "customerName",
                  render: (record) => record?.customerName || "Khách lẻ",
                },
                {
                  title: "Tổng tiền",
                  dataIndex: "price",
                  render: (record, i) => (
                    <NumericFormat value={record.price} displayType={"text"} thousandSeparator="," />
                  ),
                },
                {
                  title: "Nhân viên",
                  dataIndex: "staffName",
                  render: (record) => record["staffName"] || "Nhân viên",
                },
                {
                  title: "Ngày tạo",
                  dataIndex: "createdAt",
                  render: (record) => dayjs(record.createdAt).format("DD/MM/YYYY"),
                },
              ]}
              data={data as IOrder[]}
              rowKey={"id"}
              onRow={{
                onClick: (record) => navigate(`./${record.id}`),
              }}
            />
          </div>
          <div className="flex shrink-0 gap-2">
            <TMPagination
              total={total || 0}
              current={page}
              pageSize={pageSize}
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

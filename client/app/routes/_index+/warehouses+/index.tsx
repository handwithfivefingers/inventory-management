import type { MetaFunction } from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import { LoaderFunctionArgs } from "react-router";
import { warehouseService } from "~/action.server/warehouse.service";
import { CardItem } from "~/components/card-item";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { TMPagination } from "~/components/tm-pagination";
import { TMTable } from "~/components/tm-table";
import { dayjs } from "~/libs/date";
import { getLoaderRequestQuery } from "~/libs/utils";
import { parseCookieFromRequest } from "~/sessions";
import { IWareHouse } from "~/types/warehouse";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { cookie, vendorId } = await parseCookieFromRequest(request);
  const { page, pageSize } = getLoaderRequestQuery(request);
  const resp = await warehouseService.getWareHouses({ cookie, vendorId: vendorId, page, pageSize } as any);
  return {
    ...resp,
    page,
    pageSize,
  };
};

export const meta: MetaFunction = () => {
  return [{ title: "Warehouse" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function WareHouses() {
  const { data, total, page, pageSize } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  return (
    <div className=" w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem title="Kho bãi" className="p-4 h-full">
        <div className="flex gap-2 flex-col h-full overflow-hidden">
          <div className="flex gap-2">
            <TextInput placeholder="Lọc theo mã, tên hàng hóa" />
            <div className="ml-auto block my-auto">
              <div className="flex gap-2 flex-wrap flex-row">
                <TMButton component={Link} to="/warehouses/add">
                  Thêm
                </TMButton>
                <TMButton>Nhập từ Excel</TMButton>
                <TMButton>Xuất Excel</TMButton>
                <TMButton>In Mã Vạch</TMButton>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-col items-end flex-1">
            <TMTable
              columns={[
                {
                  title: "Kho",
                  dataIndex: "name",
                },
                {
                  title: "Tồn kho",
                  dataIndex: "quantity",
                },
                {
                  title: "Số điện thoại",
                  dataIndex: "phone",
                },
                {
                  title: "Địa chỉ",
                  dataIndex: "address",
                },
                {
                  title: "Ngày tạo",
                  dataIndex: "createdAt",
                  render: (record) => dayjs(record.createdAt).format("DD/MM/YYYY"),
                },
              ]}
              data={data as IWareHouse[]}
              rowKey={"documentId"}
              onRow={{
                onClick: (record) => {
                  navigate(`./${record.id}`);
                },
              }}
            />
          </div>
          <div className="flex  gap-2 shrink-0">
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

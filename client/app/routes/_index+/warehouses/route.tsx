import type { MetaFunction } from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import { LoaderFunctionArgs } from "react-router";
import { warehouseService } from "~/action.server/warehouse.service";
import { CardItem } from "~/components/card-item";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { TMTable } from "~/components/tm-table";
import { dayjs } from "~/libs/date";
import { getSession } from "~/sessions";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const session = await getSession(request.headers.get("Cookie"));
  const vendor = session.get("vendor");
  const resp = await warehouseService.getWareHouses(vendor as string);
  return resp;
};

export const meta: MetaFunction = () => {
  return [{ title: "Warehouse" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function WareHouses() {
  const { data } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  return (
    <div className="w-full flex flex-col p-4 gap-4">
      <CardItem title="Kho bãi">
        <div className="py-2">
          <div className="flex gap-2">
            <TextInput label="Name" placeholder="Lọc theo mã, tên hàng hóa" />
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
        </div>
        <div className="flex gap-2 flex-col items-end">
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
            data={data}
            rowKey={"documentId"}
            onRow={{
              onClick: (record) => {
                navigate(`./${record.id}`);
              },
            }}
          />
          <div className="flex  gap-2">
            <TMButton>1</TMButton>
            <TMButton>2</TMButton>
            <TMButton>3</TMButton>
          </div>
        </div>
      </CardItem>
    </div>
  );
}

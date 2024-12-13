import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { warehouseService } from "~/action.server/warehouse.service";
import { CardItem } from "~/components/card-item";
import { TextInput } from "~/components/form/text-input";
import { getSession } from "~/sessions";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { id } = params;
  const session = await getSession(request.headers.get("Cookie"));

  const vendor = session.get("vendor");
  const warehouses = await warehouseService.getWareHouseById({ id, vendor } as any);
  return warehouses;
};

export const meta: MetaFunction = () => {
  return [{ title: "New Remix App" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function WarehouseItem() {
  const { data } = useLoaderData<typeof loader>();
  return (
    <div className="w-full flex flex-col p-4 gap-4">
      <CardItem title="Thông tin kho hàng">
        <div className="bg-neutral-100 p-4 rounded-md">
          <TextInput
            label="Tên kho hàng"
            value={data.name}
            readOnly
            className="border-0 outline-0 ring-0 shadow-none !bg-transparent"
          />
          <TextInput
            label="Đia chỉ"
            value={data.address}
            readOnly
            className="border-0 outline-0 ring-0 shadow-none !bg-transparent"
          />
          <TextInput
            label="Số điện thoại"
            value={data.phone}
            readOnly
            className="border-0 outline-0 ring-0 shadow-none !bg-transparent"
          />
          <TextInput
            label="Email"
            value={data.email}
            readOnly
            className="border-0 outline-0 ring-0 shadow-none !bg-transparent"
          />
        </div>
      </CardItem>
    </div>
  );
}

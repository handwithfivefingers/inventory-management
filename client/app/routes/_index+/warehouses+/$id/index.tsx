import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { warehouseService } from "~/action.server/warehouse.service";
import { CardItem } from "~/components/card-item";
import { TextInput } from "~/components/form/text-input";
import { getSession, parseCookieFromRequest } from "~/sessions";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { id } = params;
  // const session = await getSession(request.headers.get("Cookie"));
  // const vendor = session.get("vendor");
  const { vendorId, cookie } = await parseCookieFromRequest(request);
  const resp = await warehouseService.getWareHouseById({ id: id as string, vendorId, cookie });
  return {
    ...resp,
  };
};

export const meta: MetaFunction = () => {
  return [{ title: "New Remix App" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function WarehouseItem() {
  const { data } = useLoaderData<typeof loader>();
  if (!data) return "Warehouse not found";
  return (
    <div className=" w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem title="Thông tin kho hàng" className="p-4 h-full">
        <div className="flex gap-2 flex-col h-full overflow-hidden">
          <div className="flex flex-col gap-2">
            <TextInput
              label="Tên kho hàng"
              value={data.name}
              readOnly
              className="border-0 outline-0 ring-0 shadow-none "
            />
            <TextInput
              label="Đia chỉ"
              value={data.address}
              readOnly
              className="border-0 outline-0 ring-0 shadow-none "
            />
            <TextInput
              label="Số điện thoại"
              value={data.phone}
              readOnly
              className="border-0 outline-0 ring-0 shadow-none "
            />
            <TextInput label="Email" value={data.email} readOnly className="border-0 outline-0 ring-0 shadow-none " />
          </div>
        </div>
      </CardItem>
    </div>
  );
}

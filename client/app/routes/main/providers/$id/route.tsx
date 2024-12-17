import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { warehouseService } from "~/action.server/warehouse.service";
import { ErrorComponent } from "~/components/error-component";
import { TextInput } from "~/components/form/text-input";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { id } = params;
  const warehouses = await warehouseService.getWareHouseById(id as string);
  return warehouses;
};

export const meta: MetaFunction = () => {
  return [{ title: "New Remix App" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function ProviderItem() {
  const { data } = useLoaderData<typeof loader>();
  // const navigate = useNavigate();
  return (
    <div className="w-full flex flex-col p-4 gap-4">
      <h2 className="text-2xl">Kho {data?.name}</h2>
      <div className="bg-white rounded-sm shadow-md p-4 flex gap-2 flex-col">
        <div className="flex gap-2 flex-col ">
          <h5>Thông tin kho hàng</h5>
          <div className="bg-neutral-100 px-4">
            {/* <TextInput
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
            /> */}
          </div>
        </div>
      </div>
    </div>
  );
}
export function ErrorBoundary() {
  return <ErrorComponent />;
}

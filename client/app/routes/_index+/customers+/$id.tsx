import { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData, useParams } from "@remix-run/react";
import { customerService } from "~/action.server/customer.service";
import { CardItem } from "~/components/card-item";
import { TMButton } from "~/components/tm-button";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const cookie = request.headers.get("cookie") as string;
  const id = params.id;

  if (!id) {
    throw new Response("Not found", { status: 404 });
  }

  const resp = await customerService.getCustomerById({ id, cookie });
  return resp.data?.data ?? null;
};

export const meta: MetaFunction = () => {
  return [{ title: "Chi tiết khách hàng" }];
};

export default function CustomerDetail() {
  const customer = useLoaderData<typeof loader>();

  if (!customer) {
    return <div className="p-4">Không tìm thấy khách hàng</div>;
  }

  return (
    <div className="w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem title="Chi tiết khách hàng" className="p-4">
        <div className="flex flex-col gap-4 max-w-2xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500">ID</label>
              <p className="font-medium">{customer.id}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Tên khách hàng</label>
              <p className="font-medium">{customer.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500">Số điện thoại</label>
              <p>{customer.phone || "-"}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Email</label>
              <p>{customer.email || "-"}</p>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-500">Địa chỉ</label>
            <p>{customer.address || "-"}</p>
          </div>

          <div>
            <label className="text-sm text-gray-500">Mã số thuế</label>
            <p>{customer.taxCode || "-"}</p>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Link to="/customers">
              <TMButton variant="outline">Quay lại</TMButton>
            </Link>
            <Link to={`edit`}>
              <TMButton>Chỉnh sửa</TMButton>
            </Link>
          </div>
        </div>
      </CardItem>
    </div>
  );
}

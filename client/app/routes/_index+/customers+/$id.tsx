import { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData, useParams } from "@remix-run/react";
import { customerService } from "~/action.server/customer.service";
import { CardItem } from "~/components/card-item";
import { Icon } from "~/components/icon";
import { TMButton } from "~/components/tm-button";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { cookie, vendorId } = await import("~/sessions").then((m) => m.parseCookieFromRequest(request));
  const id = params.id;

  if (!id) {
    throw new Response("Not found", { status: 404 });
  }

  const resp = await customerService.getCustomerById({ id, cookie, vendorId });
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
    <div className="w-full flex flex-col p-3 gap-3 overflow-auto h-full bg-slate-50/50 dark:bg-transparent">
      <div className="max-w-3xl w-full mx-auto">
        <CardItem
          title={
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                  <Icon name="user" fontSize={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">Chi tiết khách hàng</h2>
                  <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                    {customer.name || `ID #${customer.id}`}
                  </p>
                </div>
              </div>
            </div>
          }
          className="p-5 sm:p-6"
        >
          <div className="flex flex-col gap-5 mt-2">
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

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 mt-1">
              <TMButton variant="ghost" size="sm" component={Link} to="/customers" type="button">
                Quay lại
              </TMButton>
              <TMButton size="sm" component={Link} to={`edit`}>
                <Icon name="save" fontSize={16} />
                Chỉnh sửa
              </TMButton>
            </div>
          </div>
        </CardItem>
      </div>
    </div>
  );
}

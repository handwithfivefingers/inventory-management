import { ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { Link, useLoaderData, useNavigate, useRouteError } from "@remix-run/react";
import { useEffect, useState } from "react";
import customerService from "~/action.client/customer.service";
import { CardItem } from "~/components/card-item";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { TMPagination } from "~/components/tm-pagination";
import { TMTable } from "~/components/tm-table";
import { PermissionGuard } from "~/components/permission-guard";
import { getSession } from "~/sessions";
import { ICustomer } from "~/types/customer";

interface IFilter {
  s?: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const cookie = request.headers.get("cookie") as string;
  const session = await getSession(cookie);
  const vendorId = session.get("vendorId");
  const url = new URL(request.url);
  const params = url.searchParams;
  const page = params.get("page") || "1";
  const pageSize = params.get("pageSize") || "10";
  const search = params.get("s") || "";

  const resp = await customerService.getCustomers({
    vendorId,
    page,
    pageSize,
    search,
    cookie,
  } as any);

  return {
    ...resp,
    s: search,
    page,
    pageSize,
  };
};

export const meta: MetaFunction = () => {
  return [{ title: "Khách hàng" }, { name: "description", content: "Quản lý khách hàng" }];
};

export default function Customers() {
  const navigate = useNavigate();
  const { data, total, page, pageSize, s } = useLoaderData<typeof loader>();
  const [filter, setFilter] = useState<IFilter>({ s });

  useEffect(() => {
    let timeout: any;
    timeout = setTimeout(() => {
      navigate(`?s=${filter.s}`);
    }, 500);
    return () => timeout && clearTimeout(timeout);
  }, [filter]);

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa khách hàng này?")) {
      return;
    }
    try {
      await customerService.deleteCustomer(id);
      navigate(0);
    } catch (error: any) {
      alert(error.message || "Xóa khách hàng thất bại");
    }
  };

  return (
    <div className="w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem title="Khách hàng" className="p-4 h-full">
        <div className="flex gap-2 flex-col h-full overflow-hidden">
          <div className="flex gap-2 shrink-0 justify-between items-center">
            <TextInput
              placeholder="Lọc theo tên, số điện thoại, email"
              value={filter.s}
              onChange={(v: any) => {
                const value = v.target.value;
                setFilter({ s: value });
              }}
              className="max-w-xs"
            />
            <PermissionGuard permission="C" module="customer">
              <Link to="add">
                <TMButton>Tạo khách hàng</TMButton>
              </Link>
            </PermissionGuard>
          </div>

          <div className="flex-1 overflow-auto">
            <TMTable
              columns={[
                { title: "ID", dataIndex: "id", width: 60 },
                { title: "Tên", dataIndex: "name", width: 200 },
                { title: "Số điện thoại", dataIndex: "phone", width: 150 },
                { title: "Email", dataIndex: "email", width: 200 },
                { title: "Mã số thuế", dataIndex: "taxCode", width: 150 },
                {
                  title: "Thao tác",
                  dataIndex: "actions",
                  width: 200,
                  render: (item: ICustomer) => (
                    <div className="flex gap-2">
                      <PermissionGuard permission="R" module="customer">
                        <Link to={`${item.id}`} className="text-blue-600 hover:underline">
                          Xem
                        </Link>
                      </PermissionGuard>
                      <PermissionGuard permission="U" module="customer">
                        <Link to={`${item.id}/edit`} className="text-orange-600 hover:underline">
                          Sửa
                        </Link>
                      </PermissionGuard>
                      <PermissionGuard permission="D" module="customer">
                        <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:underline">
                          Xóa
                        </button>
                      </PermissionGuard>
                    </div>
                  ),
                },
              ]}
              data={data || []}
              rowKey="id"
            />
          </div>

          <div className="shrink-0">
            <TMPagination
              total={total || 0}
              page={Number(page)}
              pageSize={Number(pageSize)}
              onChange={(page) => navigate(`?page=${page}&pageSize=${pageSize}&s=${filter.s}`)}
            />
          </div>
        </div>
      </CardItem>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  return <div className="p-4 text-red-600">Lỗi: {(error as any).message}</div>;
}

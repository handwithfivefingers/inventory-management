import { ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { Link, useLoaderData, useNavigate, useRouteError } from "@remix-run/react";
import { useEffect, useState } from "react";
import { productService } from "~/action.server/products.service";
import { CardItem } from "~/components/card-item";
import { InputUpload } from "~/components/form/input-upload";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { TMPagination } from "~/components/tm-pagination";
import { TMTable } from "~/components/tm-table";
import { PermissionGuard } from "~/components/permission-guard";
import { dayjs } from "~/libs/date";
import { getSession, parseCookieFromRequest } from "~/sessions";
interface IFilter {
  s?: string;
}
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { cookie, session } = await parseCookieFromRequest(request);
  const warehouseId = session.get("warehouseId");
  const url = new URL(request.url);
  const params = url.searchParams;
  const page = params.get("page") || "1";
  const pageSize = params.get("pageSize") || "10";
  const s = params.get("s") || "";
  const resp = await productService.getProducts({
    warehouseId,
    page,
    pageSize,
    cookie,
    s,
  });
  return {
    data: resp.data?.data,
    total: resp.data?.total,
    s,
    page,
    pageSize,
  };
};

export const meta: MetaFunction = () => {
  return [{ title: "Sản phẩm" }, { name: "description", content: "Quản lý sản phẩm" }];
};

export default function Products() {
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
  const handleImportUpload = (file: File) => {
    alert("Function not build yet");
    // const form = new FormData();
    // form.append("products", file);
    // if (warehouse?.id) {
    //   form.append("warehouse", warehouse?.id as any);
    // }
    // fetch("http://localhost:3001/api/products/import", {
    //   method: "POST",
    //   body: form,
    // });
  };
  return (
    <div className=" w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem title="Sản phẩm" className="p-4 h-full">
        <div className="flex gap-2 flex-col h-full overflow-hidden">
          <div className="flex gap-2 shrink-0">
            <TextInput
              placeholder="Lọc theo mã, tên hàng hóa"
              value={filter.s}
              onChange={(v: any) => {
                const value = v.target.value;
                setFilter({
                  ...filter,
                  s: value,
                });
              }}
            />
            <div className="ml-auto block my-auto">
              <div className="flex gap-2 flex-wrap flex-row">
                <PermissionGuard permission="C" module="product" requireAdmin>
                  <Link to="./add">
                    <TMButton variant="light">Thêm</TMButton>
                  </Link>
                </PermissionGuard>
                <PermissionGuard permission="C" module="product" requireAdmin>
                  <InputUpload onChange={handleImportUpload} destroyOnUnMount>
                    Nhập từ Excel
                  </InputUpload>
                </PermissionGuard>
                <PermissionGuard permission="R" module="product">
                  <TMButton variant="light">Xuất Excel</TMButton>
                </PermissionGuard>
                <PermissionGuard permission="R" module="product">
                  <TMButton variant="light">In Mã Vạch</TMButton>
                </PermissionGuard>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-col items-end animate__animated animate__faster animate__fadeIn flex-1 overflow-auto">
            <TMTable
              scrollable
              columns={[
                {
                  title: "Tên sản phẩm",
                  dataIndex: "name",
                  render: (record) => record["name"],
                },
                {
                  title: "Mã sản phẩm",
                  dataIndex: "skuCode",
                  render: (record) => record["skuCode"],
                },
                {
                  title: "Tồn kho",
                  dataIndex: "quantity",
                  render: (record) => record["quantity"] || 0,
                },
                {
                  title: "Đã bán",
                  dataIndex: "sold",
                  render: (record) => record["sold"] || 0,
                },
                {
                  title: "Ngày tạo",
                  dataIndex: "createdAt",
                  render: (record) => dayjs(record.createdAt).format("DD/MM/YYYY"),
                },
              ]}
              data={data || []}
              rowKey={"id"}
              onRow={{
                onClick: (record) => navigate(`./${record?.id}`),
              }}
            />
          </div>
          <div className="flex  gap-2 shrink-0">
            <TMPagination
              total={total || 0}
              current={page}
              pageSize={pageSize}
              onPageChange={(page: number) => {
                navigate(`?page=${page}&pageSize=${pageSize}&s=${s}`);
              }}
            />
          </div>
        </div>
      </CardItem>
    </div>
  );
}
export const action = async ({ request }: ActionFunctionArgs) => {
  const { warehouseId, cookie } = await parseCookieFromRequest(request);
  const form = await request.formData();
  const s = form.get("s") || "";
  return productService.getProducts({ s: s as string, warehouseId, page: "1", pageSize: "10", cookie });
};

export function ErrorBoundary() {
  const error: any = useRouteError();
  return (
    <div>
      <h1>Error</h1>
      <p>{error?.message}</p>
      <p>{error?.stack}</p>
    </div>
  );
}

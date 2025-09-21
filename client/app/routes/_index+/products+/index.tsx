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
import { dayjs } from "~/libs/date";
import { getSession } from "~/sessions";
interface IFilter {
  s?: string;
}
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const cookie = request.headers.get("cookie") as string;
  const session = await getSession(cookie);
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
    ...resp,
    s,
    page,
    pageSize,
  };
};

export const meta: MetaFunction = () => {
  return [{ title: "New Remix App" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function Products() {
  const navigate = useNavigate();
  const { data, total, page, pageSize, s } = useLoaderData<typeof loader>();
  console.log("data", data);
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
  console.log("render");
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
                <TMButton variant="light" component={Link} to="./add">
                  Thêm
                </TMButton>
                <InputUpload onChange={handleImportUpload} destroyOnUnMount>
                  Nhập từ Excel
                </InputUpload>
                <TMButton variant="light">Xuất Excel</TMButton>
                <TMButton variant="light">In Mã Vạch</TMButton>
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
  const cookie = request.headers.get("Cookie") as string;
  const form = await request.formData();
  const s = form.get("s") || "";
  const session = await getSession(cookie);
  const warehouseId = session.get("warehouseId") as string;
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

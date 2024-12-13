import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData, useNavigate, useRouteError } from "@remix-run/react";
import { inventoryService } from "~/action.server/inventory.service";
import { productService } from "~/action.server/products.service";
import { CardItem } from "~/components/card-item";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { TMPagination } from "~/components/tm-pagination";
import { TMTable } from "~/components/tm-table";
import { dayjs } from "~/libs/date";
import { getSession } from "~/sessions";
import { IResponse } from "~/types/common";
import { IProduct } from "~/types/product";

interface ResponsePagination extends IResponse<IProduct[]> {
  page?: number;
  pageSize?: number;
}
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const session = await getSession(request.headers.get("Cookie"));
  const url = new URL(request.url);
  const params = url.searchParams;
  const page = params.get("page") || 1;
  const pageSize = params.get("pageSize") || 10;
  const warehouse = session.get("warehouse");
  const resp: ResponsePagination = await productService.getProducts({
    warehouseId: warehouse,
    page: page,
    pageSize: pageSize,
  });
  resp.page = Number(page);
  resp.pageSize = Number(pageSize);
  return resp;
};

export const meta: MetaFunction = () => {
  return [{ title: "New Remix App" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function Products() {
  const navigate = useNavigate();
  const { data, total, page, pageSize } = useLoaderData<typeof loader>();
  return (
    <div className=" w-full flex flex-col p-4 gap-4">
      <CardItem title="Sản phẩm">
        <div className="py-2">
          <div className="flex gap-2">
            <TextInput label="Name" placeholder="Lọc theo mã, tên hàng hóa" />
            <div className="ml-auto block my-auto">
              <div className="flex gap-2 flex-wrap flex-row">
                <TMButton component={Link} to="./add">
                  Thêm
                </TMButton>
                <TMButton>Nhập từ Excel</TMButton>
                <TMButton>Xuất Excel</TMButton>
                <TMButton>In Mã Vạch</TMButton>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-col items-end animate__animated animate__faster animate__fadeIn">
          <TMTable
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
              onClick: (record) => {
                console.log("record", record);
                navigate(`./${record?.id}`);
              },
            }}
          />
          <div className="flex  gap-2">
            <TMPagination
              total={total || 0}
              current={page as number}
              pageSize={pageSize as number}
              onPageChange={(page: number) => {
                // console.log("page", page);
                navigate(`?page=${page}&pageSize=${pageSize}`);
              }}
            />
          </div>
        </div>
      </CardItem>
    </div>
  );
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const form = await request.formData();
  const s = form.get("s");
  const session = await getSession(request.headers.get("Cookie"));
  const warehouse = session.get("warehouse");
  return productService.getProducts({ s: s as string, warehouseId: warehouse });
};
export function ErrorBoundary() {
  const error: any = useRouteError();
  // error.message = "Unexpected Server Error"
  // error.stack = undefined
  return (
    <div>
      <h1>Error</h1>
      <p>{error?.message}</p>
      <p>{error?.stack}</p>
    </div>
  );
}

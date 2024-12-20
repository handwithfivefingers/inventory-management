import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, data, json, useLoaderData, useNavigate } from "@remix-run/react";
import { providerService } from "~/action.server/provider.service";
import { ErrorComponent } from "~/components/error-component";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { TMTable } from "~/components/tm-table";
import { dayjs } from "~/libs/date";
import { getSession } from "~/sessions";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const session = await getSession(request.headers.get("Cookie"));
    const url = new URL(request.url);
    const params = url.searchParams;
    const page = params.get("page") || 1;
    const pageSize = params.get("pageSize") || 10;
    const vendor = session.get("vendor");

    const prods = await providerService.getProviders({ page, pageSize, vendor: vendor as string });
    return prods;
  } catch (error) {
    console.log(error instanceof Error);
    throw data(error, { status: 400 });
  }
};

export const meta: MetaFunction = () => {
  return [{ title: "New Remix App" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function Products() {
  const prods = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  console.log("prods", prods);
  return (
    <div className="w-full flex flex-col p-4 gap-4">
      <h2 className="text-2xl">Product</h2>
      <div className="bg-white rounded-sm shadow-md p-4 flex gap-2 flex-col">
        <div className="py-2">
          <div className="flex gap-2">
            <TextInput label="Name" placeholder="Lọc theo mã, tên hàng hóa" />
            <div className="ml-auto block my-auto">
              <div className="flex gap-2 flex-wrap flex-row">
                <TMButton component={Link} to="/providers/add">
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
                title: "Tên sản phẩm",
                dataIndex: "name",
              },
              {
                title: "Mã sản phẩm",
                dataIndex: "skuCode",
              },
              {
                title: "Tồn kho",
                dataIndex: "inStock",
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
            data={prods.data}
            rowKey={"documentId"}
            onRow={{
              onClick: (record) => navigate(`./${record.id}`),
            }}
          />
          <div className="flex  gap-2">
            <TMButton>1</TMButton>
            <TMButton>2</TMButton>
            <TMButton>3</TMButton>
          </div>
        </div>
      </div>
    </div>
  );
}
export function ErrorBoundary() {
  return <ErrorComponent />;
}

import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import { categoriesService } from "~/action.server/categories.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { TMPagination } from "~/components/tm-pagination";
import { TMTable } from "~/components/tm-table";
import { getSession } from "~/sessions";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const session = await getSession(request.headers.get("Cookie"));
  const url = new URL(request.url);
  const params = url.searchParams;
  const page = params.get("page") || 1;
  const pageSize = params.get("pageSize") || 10;
  const vendor = session.get("vendor");
  const resp = await categoriesService.get({
    vendorId: vendor as string,
    page: page,
    pageSize: pageSize,
  });
  console.log("resp", resp);
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
      <CardItem title="Danh mục">
        <div className="py-2">
          <div className="flex gap-2">
            <TextInput label="Name" placeholder="Lọc theo mã, tên hàng hóa" />
            <div className="ml-auto block my-auto">
              <div className="flex gap-2 flex-wrap flex-row">
                <TMButton component={Link} to="./add" variant="light">
                  Thêm
                </TMButton>
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
                navigate(`?page=${page}&pageSize=${pageSize}`);
              }}
            />
          </div>
        </div>
      </CardItem>
    </div>
  );
}
export function ErrorBoundary() {
  return <ErrorComponent />;
}

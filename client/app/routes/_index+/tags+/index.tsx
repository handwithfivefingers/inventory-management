import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import { tagsService } from "~/action.server/tags.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { TMPagination } from "~/components/tm-pagination";
import { TMTable } from "~/components/tm-table";
import { dayjs } from "~/libs/date";
import { getSession, getSessionValues } from "~/sessions";

// interface ResponsePagination extends IResponse<IProduct[]> {
//   page?: number;
//   pageSize?: number;
// }
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const cookie = request.headers.get("cookie") as string;
  const { vendorId } = await getSessionValues(cookie);
  const url = new URL(request.url);
  const params = url.searchParams;
  const page = params.get("page") || "1";
  const pageSize = params.get("pageSize") || "10";
  const resp = await tagsService.get({
    vendorId: vendorId as string,
    page,
    pageSize,
    cookie,
  });
  return {
    ...resp,
    page: Number(page),
    pageSize: Number(pageSize),
  };
};

export const meta: MetaFunction = () => {
  return [{ title: "New Remix App" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function Products() {
  const navigate = useNavigate();
  const { data, total, page, pageSize } = useLoaderData<typeof loader>();
  return (
    <div className=" w-full flex flex-col p-2 gap-2 overflow-hidden h-full">
      <CardItem title="Danh sách thành phần" className="p-4 h-full">
        <div className="flex gap-2 flex-col h-full overflow-hidden">
          <div className="flex gap-2 shrink-0">
            <TextInput label="Name" placeholder="Lọc theo mã, tên hàng hóa" />
            <div className="ml-auto block my-auto">
              <div className="flex gap-2 flex-wrap flex-row">
                <TMButton component={Link} to="./add" variant="light">
                  Thêm
                </TMButton>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-col items-end animate__animated animate__faster animate__fadeIn flex-1">
            <TMTable
              columns={[
                {
                  title: "Thành phần",
                  dataIndex: "name",
                  render: (record) => record["name"],
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
          </div>
          <div className="flex  gap-2 shrink-0">
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

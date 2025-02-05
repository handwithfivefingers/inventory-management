import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, json, useLoaderData, useNavigate } from "@remix-run/react";
import { NumericFormat } from "react-number-format";
import { financialService } from "~/action.server/financial.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { TMPagination } from "~/components/tm-pagination";
import { TMTable } from "~/components/tm-table";
import { dayjs } from "~/libs/date";
import { getSession } from "~/sessions";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const session = await getSession(request.headers.get("Cookie"));
    const warehouse = session.get("warehouse");
    const url = new URL(request.url);
    const params = url.searchParams;
    const page = params.get("page") || 1;
    const pageSize = params.get("pageSize") || 10;
    const resp = await financialService.get({ warehouse: warehouse as string, page, pageSize });
    resp.page = Number(page);
    resp.pageSize = Number(pageSize);

    return resp;
  } catch (error) {
    return json({ message: "error" }, { status: 404 });
  }
};

export const meta: MetaFunction = () => {
  return [{ title: "Nhập hàng" }, { name: "description", content: "Nhập hàng" }];
};

export default function Financial() {
  const { data, total, page, pageSize } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  return (
    <div className="w-full flex flex-col p-4 gap-4">
      <CardItem title="Product">
        <div className="py-2">
          <div className="flex gap-2">
            <TextInput label="Name" placeholder="Lọc theo mã, tên hàng hóa" />
            <div className="ml-auto block my-auto">
              <div className="flex gap-2 flex-wrap flex-row">
                <TMButton component={Link} to={"./add"}>
                  Thêm
                </TMButton>
                <TMButton component={Link}>Xuất Excel</TMButton>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-col items-end animate__animated animate__faster animate__fadeIn">
          <TMTable
            columns={[
              {
                title: "STT",
                dataIndex: "id",
                width: 80,
                render: (record, i) => Number(i) + 1,
              },
              {
                title: "Loại nhập hàng",
                dataIndex: "type",
                render: (record) => (record.type == "0" ? "Phiếu chi" : "Phiếu thu"),
              },
              {
                title: "Tổng tiền",
                dataIndex: "price",
                render: (record, i) => (
                  <NumericFormat value={record.totalPrice} displayType={"text"} thousandSeparator="," />
                ),
              },
              {
                title: "Nhân viên",
                dataIndex: "staffName",
                render: (record) => record["staffName"] || "Nhân viên",
              },
              {
                title: "Ngày tạo",
                dataIndex: "createdAt",
                render: (record) => dayjs(record.createdAt).format("DD/MM/YYYY [T] HH:mm"),
              },
            ]}
            data={data}
            rowKey={"documentId"}
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
        {/* </div> */}
      </CardItem>
    </div>
  );
}
export function ErrorBoundary() {
  return <ErrorComponent />;
}

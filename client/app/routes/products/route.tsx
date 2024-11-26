import type { MetaFunction } from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import { productService } from "~/action.server/products.service";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { TMTable } from "~/components/tm-table";
import { dayjs } from "~/libs/date";

export const loader = async () => {
  const prods = await productService.getProducts();
  return prods;
};

export const meta: MetaFunction = () => {
  return [{ title: "New Remix App" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function Products() {
  const prods = useLoaderData<typeof loader>();
  console.log("prods", prods);
  const navigate = useNavigate();
  return (
    <div className="w-full flex flex-col p-4 gap-4">
      <h2 className="text-2xl">Product</h2>
      <div className="bg-white rounded-sm shadow-md p-4 flex gap-2 flex-col">
        <div className="py-2">
          <div className="flex gap-2">
            <TextInput label="Name" placeholder="Lọc theo mã, tên hàng hóa" />
            <div className="ml-auto block my-auto">
              <div className="flex gap-2 flex-wrap flex-row">
                <TMButton component={Link} to="/add">
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
              onClick: (record) => {
                console.log("record", record);
                navigate(`./${record.documentId}`);
              },
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

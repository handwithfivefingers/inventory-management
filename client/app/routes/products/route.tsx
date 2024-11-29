import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useFetcher, useNavigate } from "@remix-run/react";
import { useEffect } from "react";
import { inventoryService } from "~/action.server/inventory.service";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { TMTable } from "~/components/tm-table";
import { dayjs } from "~/libs/date";
import { useWarehouse } from "~/store/warehouse.store";

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const warehouse = formData.get("warehouse");
  const prods = await inventoryService.getProducts({ warehouseId: warehouse });
  return prods;
};

export const meta: MetaFunction = () => {
  return [{ title: "New Remix App" }, { name: "description", content: "Welcome to Remix!" }];
};

interface IProductResponse {
  data: any[];
}
export default function Products() {
  const navigate = useNavigate();
  const { warehouse } = useWarehouse();

  const fetcher = useFetcher<IProductResponse>({ key: "products" });

  useEffect(() => {
    if (warehouse?.documentId && fetcher.state === "idle") {
      fetcher.submit(
        {
          warehouse: warehouse?.documentId,
        },
        {
          method: "POST",
          action: "/products",
        }
      );
    }
  }, [warehouse]);


  return (
    <div className="w-full flex flex-col p-4 gap-4">
      <h2 className="text-2xl">Product</h2>
      <div className="bg-white rounded-sm shadow-md p-4 flex gap-2 flex-col">
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
        <div className="flex gap-2 flex-col items-end">
          <TMTable
            columns={[
              {
                title: "Tên sản phẩm",
                dataIndex: "name",
                render: (record) => record["product"]?.["name"],
              },
              {
                title: "Mã sản phẩm",
                dataIndex: "skuCode",
                render: (record) => record["product"]?.["skuCode"],
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
            data={fetcher?.data?.data || []}
            rowKey={"documentId"}
            onRow={{
              onClick: (record) => {
                console.log("record", record);
                navigate(`./${record?.product?.documentId}`);
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

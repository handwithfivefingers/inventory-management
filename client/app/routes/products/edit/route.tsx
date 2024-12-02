import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { NumericFormat } from "react-number-format";
import { productService } from "~/action.server/products.service";
import { BarCode } from "~/components/barcode";
import { CardItem } from "~/components/card-item";
import { dayjs } from "~/libs/date";
import { getSession } from "~/sessions";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const session = await getSession(request.headers.get("Cookie"));
  const warehouse = session.get("warehouse");
  const { id } = params;
  const resp = await productService.getProductById({ id, warehouse } as any);
  return resp;
};

export const meta: MetaFunction = () => {
  return [{ title: "Product Item" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function ProductItem() {
  const { data } = useLoaderData<typeof loader>();
  return (
    <div className="w-full flex flex-col p-4 gap-4">
      <CardItem title={data.name}>
        <div className="w-full grid grid-cols-5 gap-4">
          <div className="col-span-2 flex gap-2 flex-col ">
            <div className="bg-slate-50 w-full h-full p-8 rounded-lg aspect-square" />
            <div className="w-full py-2 rounded-md flex justify-center">
              <BarCode code={data?.code} />
            </div>
          </div>
          <div className="col-span-3 px-12">
            <ul className="flex flex-col gap-2">
              <li className="flex justify-between">
                <span>Ngày tạo: </span>
                <span>{dayjs(data.createdAt).format("DD/MM/YYYY")}</span>
              </li>
              <li className="flex justify-between">
                <span>Mã hàng hóa: </span>
                <span>{data.code} </span>
              </li>
              <li className="flex justify-between">
                <span>Mã sku: </span>
                <span>{data.skuCode} </span>
              </li>
              <li className="flex justify-between">
                <span>Đã bán: </span>
                <span>{data?.sold} </span>
              </li>
              <li className="flex justify-between">
                <span>Tồn kho: </span>
                <span>{data?.quantity} </span>
              </li>
              <li className="flex justify-between">
                <span>Đơn vị tính: </span>
                <span>{data?.unit} </span>
              </li>
              <li className="flex justify-between">
                <span>Danh mục: </span>
                <span>{data?.categories} </span>
              </li>
              <li className="flex justify-between">
                <span>Giá bán lẻ: </span>
                <span>
                  <NumericFormat value={data?.regularPrice} displayType="text" thousandSeparator="," />
                </span>
              </li>
              <li className="flex justify-between">
                <span>Giá khuyến mại: </span>
                <span>
                  <NumericFormat value={data?.salePrice} displayType="text" thousandSeparator="," />
                </span>
              </li>
              <li className="flex justify-between">
                <span>Giá bán sỉ: </span>
                <span>
                  <NumericFormat value={data?.wholeSalePrice} displayType="text" thousandSeparator="," />
                </span>
              </li>
              <li className="flex justify-between">
                <span>Giá vốn: </span>
                <span>
                  <NumericFormat value={data?.costPrice} displayType="text" thousandSeparator="," />
                </span>
              </li>
            </ul>
          </div>
        </div>
      </CardItem>
      <CardItem title={`Lịch sử tồn kho`}>
        <div className="w-full ">
          {/* {history?.map((item: any, i: number) => {
              return <ProductAttributes data={item} key={i} />;
            })} */}
          {/* <TMTable
            data={history}
            columns={[
              {
                title: "Tồn kho",
                dataIndex: "inStock",
              },
              {
                title: "Đã bán",
                dataIndex: "sold",
              },

              {
                title: "Giá bán lẻ",
                dataIndex: "regularPrice",
                render: (record) => (
                  <NumericFormat value={record.regularPrice} displayType="text" thousandSeparator="," />
                ),
              },
              {
                title: "Giá khuyến mại",
                dataIndex: "salePrice",
                render: (record) => <NumericFormat value={record.salePrice} displayType="text" thousandSeparator="," />,
              },
              {
                title: "Giá bán sỉ",
                dataIndex: "wholesalePrice",
                render: (record) => (
                  <NumericFormat value={record.wholesalePrice} displayType="text" thousandSeparator="," />
                ),
              },
              {
                title: "Giá vốn",
                dataIndex: "costPrice",
                render: (record) => <NumericFormat value={record.costPrice} displayType="text" thousandSeparator="," />,
              },
            ]}
            rowKey="id"
          /> */}
        </div>
      </CardItem>
    </div>
  );
}

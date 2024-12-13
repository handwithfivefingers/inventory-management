import { zodResolver } from "@hookform/resolvers/zod";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { categoriesService } from "~/action.server/categories.service";
import { productService } from "~/action.server/products.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { TMTable } from "~/components/tm-table";
import { productSchema } from "~/constants/schema/product";
import { dayjs } from "~/libs/date";
import { getSession } from "~/sessions";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const session = await getSession(request.headers.get("Cookie"));
  const vendorId = session.get("vendor");
  const { id } = params;
  const resp = await categoriesService.getById({ id, vendorId } as any);
  return resp;
};

export const meta: MetaFunction = () => {
  return [{ title: "Product Item" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function ProductItem() {
  const { data } = useLoaderData<typeof loader>();
  const [edit, setEdit] = useState<boolean>(false);
  console.log("data", data);
  return (
    <div className="w-full flex flex-col p-4 gap-4">
      <CardItem
        title={
          <div className="flex justify-between items-center">
            <h5>{edit ? "Chỉnh sửa" : data?.name}</h5>
            <TMButton variant="ghost" size="xs" onClick={() => setEdit(!edit)}>
              {edit ? "Hủy" : "Sửa"}
            </TMButton>
          </div>
        }
      >
        {!edit ? <Detail /> : null}

        {edit ? <EditForm /> : null}
      </CardItem>
    </div>
  );
}
const Detail = () => {
  const { data } = useLoaderData<typeof loader>();
  const { products } = data;
  const navigate = useNavigate();
  if (!products?.length) return "Khong co san pham nao";
  return (
    <div className="w-full grid grid-cols-5 gap-4">
      <div className="col-span-5">
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
          data={products || []}
          rowKey={"id"}
          onRow={{
            onClick: (record) => {
              console.log("record", record);
              navigate(`/products/${record?.id}`);
            },
          }}
        />
      </div>
    </div>
  );
};
const EditForm = () => {
  const fetcher = useFetcher();
  const formMethods = useForm({
    defaultValues: {
      name: "",
    },
    resolver: zodResolver(productSchema),
  });

  const handleError = (errors: any) => {
    console.log("errors", errors);
  };
  const onSubmit = (v: any): void => {
    fetcher.submit(
      {
        data: JSON.stringify({
          data: v,
        }),
      },
      { method: "POST", action: "/categories/add" }
    );
  };
  return (
    <form
      className="py-2 grid grid-cols-12 gap-4"
      onSubmit={formMethods.handleSubmit(
        (v) => onSubmit({ ...v }),
        (error) => handleError(error)
      )}
    >
      <div className="col-span-12">
        <Controller
          name="name"
          control={formMethods.control}
          render={({ field }) => {
            return (
              <TextInput
                label="Tên danh mục"
                value={field.value as any}
                onChange={(e: EventTarget | MouseEvent | any) => field.onChange(e.target.value)}
              />
            );
          }}
        />
      </div>
      <div className="ml-auto col-span-12">
        <TMButton htmlType="submit" variant="light">
          Thêm
        </TMButton>
      </div>
    </form>
  );
};

export const action = async ({ request }: any) => {
  const session = await getSession(request.headers.get("Cookie"));
  const warehouse = session.get("warehouse");
  const formData = await request.formData();
  const data = await formData.get("data");
  const dataJson = JSON.parse(data);
  const bodyData = { ...dataJson.data, warehouseId: warehouse };
  const resp = await productService.updateProduct(bodyData);
  return resp;
};
export function ErrorBoundary() {
  return <ErrorComponent />;
}
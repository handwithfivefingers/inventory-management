import { zodResolver } from "@hookform/resolvers/zod";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, redirect, useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { categoryService } from "~/action.server/category.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { FormControl } from "~/components/form/form-control";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { TMButton } from "~/components/tm-button";
import { TMTable } from "~/components/tm-table";
import { productSchema } from "~/constants/schema/product";
import { dayjs } from "~/libs/date";
import { parseCookieFromRequest } from "~/sessions";
import { ICategory } from "~/types/category";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { cookie, vendorId } = await parseCookieFromRequest(request);
  const { id } = params;
  const resp = await categoryService.getById({ id: id as string, vendorId, cookie });
  return resp;
};

export const meta: MetaFunction = () => {
  return [{ title: "Category Detail" }];
};

export default function ProductItem() {
  const { data } = useLoaderData<typeof loader>();
  const [edit, setEdit] = useState<boolean>(false);
  return (
    <div className="w-full flex flex-col p-3 gap-3 overflow-auto h-full bg-slate-50/50 dark:bg-transparent">
      <div className="max-w-3xl w-full mx-auto">
        <CardItem
          title={
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                  <Icon name="tag" fontSize={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">
                    {edit ? "Chỉnh sửa danh mục" : data?.name}
                  </h2>
                  <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                    {edit ? "Cập nhật thông tin danh mục" : "Chi tiết danh mục và sản phẩm liên quan"}
                  </p>
                </div>
              </div>
              <TMButton variant={edit ? "ghost" : "primary"} size="sm" onClick={() => setEdit(!edit)}>
                <Icon name={edit ? "x" : "edit-2"} fontSize={14} />
                {edit ? "Hủy" : "Sửa"}
              </TMButton>
            </div>
          }
          className="p-5 sm:p-6"
        >
          {!edit ? <Detail /> : null}

          {edit ? <EditForm {...data} /> : null}
        </CardItem>
      </div>
    </div>
  );
}
const Detail = () => {
  const { data } = useLoaderData<typeof loader>();
  const { products } = data || { products: [] };
  const navigate = useNavigate();
  // if (!products?.length) return "Khong co san pham nao";
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
const EditForm = ({ name, id }: Partial<ICategory>) => {
  const fetcher = useFetcher();
  const formMethods = useForm({
    defaultValues: {
      name: "",
    },
    values: {
      name,
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
      { method: "POST", action: `/categories/${id}` }
    );
  };
  return (
    <FormProvider {...formMethods}>
      <form
        className="flex flex-col gap-5 mt-2"
        onSubmit={formMethods.handleSubmit(
          (v) => onSubmit({ ...v }),
          (error) => handleError(error)
        )}
      >
        <FormControl name="name">
          {(field) => {
            return (
              <TextInput
                label="Tên danh mục"
                required
                prefix={<Icon name="tag" fontSize={16} className="text-slate-400" />}
                value={field.value as any}
                onChange={(e: EventTarget | MouseEvent | any) => field.onChange(e.target.value)}
              />
            );
          }}
        </FormControl>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 mt-1">
          <TMButton variant="ghost" size="sm" component={Link} to=".." type="button">
            Hủy
          </TMButton>
          <TMButton htmlType="submit" size="sm">
            <Icon name="save" fontSize={16} />
            Lưu
          </TMButton>
        </div>
      </form>
    </FormProvider>
  );
};

export const action = async ({ request, params }: any) => {
  const { cookie, vendorId } = await parseCookieFromRequest(request);
  const formData = await request.formData();
  const { id } = params;
  const data = await formData.get("data");
  const dataJson = JSON.parse(data);
  const bodyData = { ...dataJson.data, id };
  const resp = await categoryService.update({ ...bodyData, vendorId, cookie });
  if (resp.status === 200) {
    return redirect(`/categories`, 302);
  }
  return resp;
};
export function ErrorBoundary() {
  return <ErrorComponent />;
}

import { zodResolver } from "@hookform/resolvers/zod";
import type { MetaFunction } from "@remix-run/node";
import { useFetcher, useRouteError } from "@remix-run/react";
import { MouseEvent, useEffect } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { productService } from "~/action.server/products.service";
import { MultiSelectInput } from "~/components/form/multi-select-input";
import { NumberInput } from "~/components/form/number-input";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { productSchema } from "~/constants/schema/product";
import { getSession } from "~/sessions";
import { ICategory } from "~/types/category";
export const meta: MetaFunction = () => {
  return [{ title: "New Remix App" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function ProductItem() {
  const fetcher = useFetcher();
  const formMethods = useForm({
    defaultValues: {
      name: "",
      code: "SM-001",
      skuCode: "ASM-0000001",
      quantity: 10,
      unit: undefined,
      categories: undefined,
      description: undefined,
      tags: undefined,
      costPrice: "20000",
      regularPrice: "50000",
      salePrice: "45000",
      wholeSalePrice: "40000",
      VAT: 5,
      expiredAt: undefined,
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
      { method: "POST", action: "/products/add" }
    );
  };

  const { load, data } = useFetcher<{ data: ICategory[] }>({ key: "categories" });
  const { load: loadTags, data: tags } = useFetcher<{ data: ICategory[] }>({ key: "tags" });

  useEffect(() => {
    load("/categories");
    loadTags("/tags");
    (window as any).form = formMethods;
  }, []);

  return (
    <div className="w-full flex flex-col p-4 gap-4">
      <h2 className="text-2xl">Product</h2>
      <div className="bg-white rounded-sm shadow-md p-4 flex gap-2 flex-col">
        <FormProvider {...formMethods}>
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
                      label="Tên hàng hóa"
                      value={field.value as any}
                      onChange={(e: EventTarget | MouseEvent | any) => field.onChange(e.target.value)}
                    />
                  );
                }}
              />
            </div>
            <div className="col-span-6">
              <Controller
                name="code"
                control={formMethods.control}
                render={({ field }) => {
                  return (
                    <TextInput
                      label="Mã code"
                      value={field.value as any}
                      onChange={(e: EventTarget | MouseEvent | any) => field.onChange(e.target.value)}
                    />
                  );
                }}
              />
            </div>
            <div className="col-span-6">
              <Controller
                name="skuCode"
                control={formMethods.control}
                render={({ field }) => {
                  return (
                    <TextInput
                      label="Mã sku"
                      value={field.value as any}
                      onChange={(e: EventTarget | MouseEvent | any) => field.onChange(e.target.value)}
                    />
                  );
                }}
              />
            </div>
            <div className="col-span-4">
              <Controller
                name="costPrice"
                control={formMethods.control}
                render={({ field }) => {
                  return (
                    <NumberInput
                      label="Giá vốn"
                      value={field.value as any}
                      onValueChange={(v, info) => {
                        field.onChange(v.value);
                      }}
                    />
                  );
                }}
              />
            </div>
            <div className="col-span-4">
              <Controller
                name="regularPrice"
                control={formMethods.control}
                render={({ field }) => {
                  return (
                    <NumberInput
                      label="Giá bán lẻ"
                      value={field.value as any}
                      onValueChange={(v, info) => {
                        field.onChange(v.value);
                      }}
                    />
                  );
                }}
              />
            </div>
            <div className="col-span-4">
              <Controller
                name="salePrice"
                control={formMethods.control}
                render={({ field }) => {
                  return (
                    <NumberInput
                      label="Giá khuyến mại"
                      value={field.value as any}
                      onValueChange={(v, info) => {
                        field.onChange(v.value);
                      }}
                    />
                  );
                }}
              />
            </div>
            <div className="col-span-4">
              <Controller
                name="wholeSalePrice"
                control={formMethods.control}
                render={({ field }) => {
                  return (
                    <NumberInput
                      label="Giá bán sỉ"
                      value={field.value as any}
                      onValueChange={(v, info) => {
                        field.onChange(v.value);
                      }}
                    />
                  );
                }}
              />
            </div>
            <div className="col-span-6">
              <Controller
                name="expiredAt"
                control={formMethods.control}
                render={({ field }) => {
                  return (
                    <NumberInput
                      label="Ngày hết hạn"
                      value={field.value as any}
                      onValueChange={(v, info) => {
                        field.onChange(v.value);
                      }}
                    />
                  );
                }}
              />
            </div>
            <div className="col-span-2">
              <Controller
                name="VAT"
                control={formMethods.control}
                render={({ field }) => {
                  return (
                    <NumberInput
                      label="VAT(%)"
                      value={field.value as any}
                      onValueChange={(v, info) => {
                        field.onChange(v.value);
                      }}
                    />
                  );
                }}
              />
            </div>
            <div className="col-span-6">
              <Controller
                name="quantity"
                control={formMethods.control}
                render={({ field }) => {
                  return (
                    <NumberInput
                      label="Tồn kho"
                      value={field.value as any}
                      onValueChange={(v, info) => {
                        field.onChange(v.value);
                      }}
                    />
                  );
                }}
              />
            </div>
            <div className="col-span-6">
              <Controller
                name="unit"
                control={formMethods.control}
                render={({ field }) => {
                  return (
                    <TextInput
                      label="Đơn vị tính"
                      {...field}
                      onChange={(e: EventTarget | MouseEvent | any) => field.onChange(e.target.value)}
                    />
                  );
                }}
              />
            </div>
            <div className="col-span-6">
              <Controller
                name="categories"
                control={formMethods.control}
                render={({ field }) => {
                  return (
                    <MultiSelectInput
                      options={data?.data?.map((cate) => ({ label: cate.name, value: cate.id })) || []}
                      label="Danh mục"
                      {...field}
                      onSelect={(v) => field.onChange(v)}
                    />
                  );
                }}
              />
            </div>
            <div className="col-span-6">
              <Controller
                name="tags"
                control={formMethods.control}
                render={({ field }) => {
                  return (
                    <MultiSelectInput
                      options={tags?.data?.map((tag) => ({ label: tag.name, value: tag.id })) || []}
                      label="Thành phần"
                      {...field}
                      onSelect={(v) => field.onChange(v)}
                    />
                  );
                }}
              />
            </div>
            <div className="col-span-12">
              <Controller
                name="description"
                control={formMethods.control}
                render={({ field }) => {
                  return (
                    <TextInput
                      label="Ghi chú"
                      {...field}
                      onChange={(e: EventTarget | MouseEvent | any) => field.onChange(e.target.value)}
                    />
                  );
                }}
              />
            </div>
            <div className="ml-auto col-span-12">
              <TMButton htmlType="submit">Submit</TMButton>
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}

export const action = async ({ request }: any) => {
  const session = await getSession(request.headers.get("Cookie"));
  const warehouse = session.get("warehouse");
  const formData = await request.formData();
  const data = await formData.get("data");
  const dataJson = JSON.parse(data);
  const bodyData = { ...dataJson.data, warehouseId: warehouse };
  const resp = await productService.createProduct(bodyData);
  return resp;
};
export function ErrorBoundary() {
  const error: any = useRouteError();
  return (
    <div>
      <h1>Error</h1>
      <p>{error?.message}</p>
      <p>{error?.stack}</p>
    </div>
  );
}

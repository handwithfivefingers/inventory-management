import { zodResolver } from "@hookform/resolvers/zod";
import type { MetaFunction } from "@remix-run/node";
import { useFetcher, useRouteError, useSubmit } from "@remix-run/react";
import { MouseEvent, useEffect } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { productService } from "~/action.server/products.service";
import { CardItem } from "~/components/card-item";
import { FormInput } from "~/components/form/formInput";
import { MultiSelectInput } from "~/components/form/multi-select-input";
import { NumberInput } from "~/components/form/number-input";
import { SelectInput } from "~/components/form/select-input";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
import { productSchema, ProductSchemaType } from "~/constants/schema/product";
import { useSubmitPromise } from "~/hooks";
import { getSession, getSessionValues, parseCookieFromRequest } from "~/sessions";
import { ICategory } from "~/types/category";
export const meta: MetaFunction = () => {
  return [{ title: "New Remix App" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function ProductItem() {
  const fetcher = useFetcher();
  const { submit, isLoading } = useSubmitPromise();
  const formMethods = useForm<ProductSchemaType>({
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
  const onSubmit = async (v: ProductSchemaType) => {
    const response = await submit(
      {
        data: JSON.stringify(v),
      },
      { method: "POST" }
    );
    console.log("response", response);
  };

  const { load, data } = useFetcher<{ data: ICategory[] }>({ key: "categories" });
  const { load: loadTags, data: tags } = useFetcher<{ data: ICategory[] }>({ key: "tags" });
  const { load: loadUnits, data: units } = useFetcher<{ data: ICategory[] }>({ key: "units" });

  useEffect(() => {
    load("/categories");
    // loadTags("/tags");
    loadUnits("/units");
    (window as any).form = formMethods;
  }, []);

  return (
    <div className="w-full flex flex-col p-2 gap-4">
      <CardItem title="Sản phẩm" className="p-4">
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
                      <SelectInput
                        options={units?.data?.map((cate) => ({ label: cate.name, value: cate?.id || undefined })) || []}
                        label="Đơn vị tính"
                        {...field}
                        onSelect={(v) => field.onChange(v)}
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
                <FormInput name="description">
                  <TextInput label="Ghi chú" />
                </FormInput>
              </div>
              <div className="ml-auto col-span-12">
                <TMButton htmlType="submit" loading={isLoading}>
                  Submit
                </TMButton>
              </div>
            </form>
          </FormProvider>
        </div>
      </CardItem>
    </div>
  );
}

export const action = async ({ request }: any) => {
  const { warehouseId, cookie } = await parseCookieFromRequest(request);
  const formData = await request.formData();
  const data = await formData.get("data");
  const dataJson = JSON.parse(data);
  const bodyData = { ...dataJson, warehouseId, cookie };
  const resp = await productService.createProduct(bodyData);
  return resp;
};

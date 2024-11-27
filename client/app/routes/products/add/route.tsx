import { zodResolver } from "@hookform/resolvers/zod";
import type { MetaFunction } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import { MouseEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { productClientService } from "~/action.client/products.service";
import { productService } from "~/action.server/products.service";
import { NumberInput } from "~/components/form/number-input";
import { TextInput } from "~/components/form/text-input";
import { TMButton } from "~/components/tm-button";
export const meta: MetaFunction = () => {
  return [{ title: "New Remix App" }, { name: "description", content: "Welcome to Remix!" }];
};

export const action = async ({ request }: any) => {
  const formData = await request.formData();
  const data = await formData.get("data");
  const parsed = JSON.parse(data);
  console.log("parsed", parsed);
  const stringify = JSON.stringify({ data: parsed });
  const resp = await productService.createProduct(stringify as any);
  return resp;
};
const productSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  skuCode: z.string().optional(),
  unit: z.string().optional(),

  productDetails: z.object({
    inStock: z.number().optional(),
    costPrice: z.number().or(z.string()).optional(),
    regularPrice: z.number().or(z.string()).optional(),
    salePrice: z.number().or(z.string()).optional(),
    wholeSalePrice: z.number().or(z.string()).optional(),
    VAT: z.number().optional(),
    expiredAt: z.string().optional(),
  }),
});

export default function ProductItem() {
  const fetcher = useFetcher();
  const formMethods = useForm({
    defaultValues: {
      name: "",
      code: "SM-001",
      skuCode: "ASM-0000001",
      productDetails: {
        inStock: 10,
        costPrice: "20000",
        regularPrice: "50000",
        salePrice: "45000",
        wholeSalePrice: "40000",
        VAT: 5,
        expiredAt: undefined,
      },
    },
    resolver: zodResolver(productSchema),
  });

  const handleError = (errors: any) => {
    console.log("errors", errors);
  };
  const onSubmit = (v: any): void => {
    v.warehouses = "not8o7o77wixki7pi8ke3zfe";
    v.vendor = "nc4muju7axrit4jgb57mzctv";

    productClientService.createProduct({ data: v }).then((res) => {
      console.log("res", res);
    });
  };

  console.log("fetcher", fetcher);
  return (
    <div className="w-full flex flex-col p-4 gap-4">
      <h2 className="text-2xl">Product</h2>
      <div className="bg-white rounded-sm shadow-md p-4 flex gap-2 flex-col">
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
              name="productDetails.costPrice"
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
              name="productDetails.regularPrice"
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
              name="productDetails.salePrice"
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
              name="productDetails.wholeSalePrice"
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
              name="productDetails.expiredAt"
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
              name="productDetails.VAT"
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
            <TextInput name="unit" label="Đơn vị tính" />
          </div>

          <div className="col-span-6 ">
            <TextInput name="inStock" label="Tồn kho" />
          </div>
          <div className="col-span-6">
            <TextInput name="category" label="Danh mục" />
          </div>

          <div className="col-span-6">
            <TextInput name="tags" label="Thành phần" />
          </div>
          <div className="col-span-12">
            <TextInput name="note" label="Ghi chú" />
          </div>
          <TMButton htmlType="submit">Submit</TMButton>
        </form>
      </div>
    </div>
  );
}

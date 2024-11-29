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
import { http } from "~/http";
import { useUser } from "~/store/user.store";
import { useVendor } from "~/store/vendor.store";
import { useWarehouse } from "~/store/warehouse.store";
export const meta: MetaFunction = () => {
  return [{ title: "New Remix App" }, { name: "description", content: "Welcome to Remix!" }];
};

export const action = async ({ request }: any) => {
  const formData = await request.formData();
  const data = await formData.get("data");

  const dataJson = JSON.parse(data);
  const bodyData = { data: dataJson.data };
  http.setToken(dataJson.Authorization);
  const resp = await productService.createProduct(bodyData, dataJson.qs);
  return resp;
};
const productSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  skuCode: z.string().optional(),
  unit: z.string().optional(),
  category: z.string().optional(),
  tags: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().or(z.string()).optional(),
  productDetails: z.object({
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
      quantity: 10,
      unit: undefined,
      category: undefined,
      description: undefined,
      tags: undefined,
      productDetails: {
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
  const { warehouse } = useWarehouse();
  const { defaultActive } = useVendor();
  const { jwt } = useUser();
  const onSubmit = (v: any): void => {
    const qs = {
      quantity: v.quantity as string,
      warehouseId: warehouse?.documentId as string,
      vendorId: defaultActive?.documentId as string,
    };
    const { ...parsed } = v;
    delete parsed.quantity;
    delete parsed.warehouseId;
    delete parsed.vendorId;

    // productClientService.createProduct({ data: parsed }, qs).then((res) => {
    //   console.log("res", res);
    // });

    fetcher.submit(
      {
        data: JSON.stringify({
          data: parsed,
          qs: qs,
          Authorization: `${jwt}`,
        }),
      },
      { method: "POST", action: "/products/add" }
    );
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
              name="category"
              control={formMethods.control}
              render={({ field }) => {
                return (
                  <TextInput
                    label="Danh Mục"
                    {...field}
                    onChange={(e: EventTarget | MouseEvent | any) => field.onChange(e.target.value)}
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
                  <TextInput
                    label="Thành phần"
                    {...field}
                    onChange={(e: EventTarget | MouseEvent | any) => field.onChange(e.target.value)}
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
      </div>
    </div>
  );
}

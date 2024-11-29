import { zodResolver } from "@hookform/resolvers/zod";
import type { MetaFunction } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import React, { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { productService } from "~/action.server/products.service";
import { BarcodeScanner } from "~/components/barcode-scanner";
import { CardItem } from "~/components/card-item";
import { NumberInput } from "~/components/form/number-input";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { TMButton } from "~/components/tm-button";
import { TMModal } from "~/components/tm-modal";
import { orderSchema } from "~/constants/schema/order";
import { http } from "~/http";
import { useUser } from "~/store/user.store";
import { useVendor } from "~/store/vendor.store";
import { useWarehouse } from "~/store/warehouse.store";
import { IProduct } from "~/types/product";

export const loader = async () => {
  const prod = await productService.getProducts();
  return prod;
};
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

interface IProductForm extends IProduct {
  quantity?: number | string;
  price?: number | string;
  total?: number | string;
  product: string;
}
export default function OrderItem() {
  const fetcher = useFetcher();
  const [show, setShow] = useState(false);
  const { data } = useLoaderData<typeof loader>();
  const { control, watch, getValues, setValue, ...formMethods } = useForm({
    defaultValues: {
      customer: undefined,
      OrderDetails: [],
      price: 0,
      VAT: "5",
      warehouse: undefined,
      surcharge: "0",
      paid: 0,
      paymentType: "cash",
    },
    resolver: zodResolver(orderSchema),
  });
  const { fields, append, prepend, remove, swap, move, insert, replace } = useFieldArray<any>({
    control, // control props comes from useForm (optional: if you are using FormProvider)
    name: "OrderDetails", // unique name for your Field Array
  });

  const orderDetails = watch("OrderDetails");
  const surcharge = watch("surcharge");
  const VAT = watch("VAT");
  const controlledFields = fields.map((field, index) => {
    return {
      ...field,
      ...(orderDetails[index] as any),
    };
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

  const handleAdd = (item: IProduct) => {
    const currentValue: IProductForm[] = getValues("OrderDetails");
    if (!currentValue.length) {
      const result = {
        product: item.documentId,
        name: item.name,
        quantity: 1,
        price: Number(item.productDetails.regularPrice),
        total: Number(item.productDetails.regularPrice),
        note: "",
      };
      return append(result);
    } else {
      let index = currentValue.findIndex((cItem) => item.documentId === cItem.product && cItem.product);
      if (index === -1) {
        const result = {
          product: item.documentId,
          name: item.name,
          quantity: 1,
          price: Number(item.productDetails.regularPrice),
          total: Number(item.productDetails.regularPrice),
          note: "",
        };
        return append(result);
      } else {
        const target = { ...currentValue[index] };
        const quantity = Number(target.quantity) + 1;
        target.quantity = quantity;
        target.total = quantity * Number(target.price);
        currentValue[index] = target;
        return replace(currentValue);
      }
    }
  };
  const onQuantityChange = ({ value, float }: any, field: any, pos: number) => {
    field.onChange(value);
    const price = getValues(`OrderDetails.${pos}.price` as any);
    const v = Number(value) * Number(price);
    setValue(`OrderDetails.${pos}.total` as any, v);
  };
  const onChangePrice = ({ value, float }: any, field: any, pos: number) => {
    field.onChange(value);
    const quantity = getValues(`OrderDetails.${pos}.quantity` as any);
    const v = Number(value) * Number(quantity);
    setValue(`OrderDetails.${pos}.total` as any, v);
  };

  const total = orderDetails?.reduce((total, item: IProductForm) => total + Number(item?.total), 0);
  let combineTotal = total + Number(surcharge);
  const totalPaid = Number(combineTotal + (combineTotal / 100) * Number(VAT));

  const [canScan, setCanScan] = useState(true);

  const handleRetrieveData = async (barcode: any) => {
    setCanScan(false);
    const item = data?.find((item: IProduct) => item.code == barcode);
    if (item) {
      handleAdd(item);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setCanScan(true);
  };

  return (
    <div className="w-full flex flex-col p-4 gap-4">
      <BarcodeScanner onScan={handleRetrieveData} start={canScan}>
        <form
          className="flex gap-4 flex-col"
          onSubmit={formMethods.handleSubmit(
            (v) => onSubmit({ ...v }),
            (error) => handleError(error)
          )}
        >
          <div className="ml-auto col-span-12">
            <TMButton htmlType="submit">Submit</TMButton>
          </div>
          <CardItem
            title={
              <div className="flex justify-between items-center">
                <label className="text-lg">Hàng hóa</label>
                <TMButton className="font-normal" onClick={() => setShow(true)}>
                  Chọn hàng hóa
                </TMButton>
              </div>
            }
            className="min-h-80"
          >
            <div className="col-span-12 grid grid-cols-12 gap-2 py-2 mb-4 border-b-2 border-indigo-200">
              <div className="col-span-1 ">STT</div>
              <div className="col-span-4">Tên sản phẩm</div>
              <div className="col-span-2">Số lượng</div>
              <div className="col-span-3">Giá tiền</div>
              <div className="col-span-2">Tổng tiền</div>
            </div>
            <div className="min-h-40">
              {controlledFields?.map((field, i: number) => {
                return (
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 grid grid-cols-12 gap-2 items-center" key={field.id}>
                      <div className="hidden">
                        <Controller
                          control={control}
                          name={`OrderDetails.${i}.product` as any}
                          render={({ field }) => {
                            return <TextInput {...field} readOnly />;
                          }}
                        />
                      </div>
                      <div className="col-span-1 px-2">
                        <div className="mb-2 px-2">{i + 1}</div>
                      </div>
                      <div className="col-span-4 ">
                        <Controller
                          control={control}
                          name={`OrderDetails.${i}.name` as any}
                          render={({ field }) => {
                            return <TextInput {...field} readOnly />;
                          }}
                        />
                      </div>
                      <div className="col-span-2">
                        <Controller
                          control={control}
                          name={`OrderDetails.${i}.quantity` as any}
                          render={({ field }) => {
                            return (
                              <NumberInput
                                value={field.value as any}
                                onValueChange={(v) => onQuantityChange(v, field, i)}
                              />
                            );
                          }}
                        />
                      </div>
                      <div className="col-span-3">
                        <Controller
                          control={control}
                          name={`OrderDetails.${i}.price` as any}
                          render={({ field }) => {
                            return (
                              <NumberInput
                                value={field.value as any}
                                onValueChange={(v) => onChangePrice(v, field, i)}
                              />
                            );
                          }}
                        />
                      </div>
                      <div className="col-span-2 px-2">
                        <div className="mb-2">
                          <Controller
                            control={control}
                            name={`OrderDetails.${i}.total` as any}
                            render={({ field }) => {
                              return (
                                <NumberInput
                                  value={field.value as any}
                                  onValueChange={(v, info) => {
                                    field.onChange(v.value);
                                  }}
                                  displayType="text"
                                />
                              );
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="col-span-12 grid grid-cols-12 gap-2 py-4 mt-4 border-t-2 border-indigo-200">
              <div className="col-span-12 ml-auto flex flex-col gap-1">
                <div className="w-96 flex justify-between ">
                  <span>Tổng tiền</span>
                  <NumberInput value={`${total}`} displayType="text" />
                </div>
                <div className="w-96 flex justify-between">
                  <span>Phụ phí</span>{" "}
                  <div className="w-40">
                    <Controller
                      control={control}
                      name="surcharge"
                      render={({ field }) => (
                        <NumberInput value={`${field.value}`} onValueChange={(v) => field.onChange(v.value)} />
                      )}
                    />
                  </div>
                </div>
                <div className="w-96 flex justify-between">
                  <span> VAT </span>
                  <div className="w-40">
                    <Controller
                      control={control}
                      name="VAT"
                      render={({ field }) => (
                        <NumberInput
                          maxLength={4}
                          max={1000}
                          value={`${field.value}`}
                          onValueChange={(v) => field.onChange(v.value)}
                          suffix="%"
                        />
                      )}
                    />
                  </div>
                </div>
                <div className="w-96 flex justify-between">
                  <span>Tổng tiền đơn hàng </span>
                  <NumberInput value={`${totalPaid}`} displayType="text" />
                </div>
                <div className="h-[2px] bg-indigo-600 my-2" />
                <div className="w-96 flex justify-between font-bold">
                  <span>Tổng phải thu</span> <NumberInput value={`${totalPaid}`} displayType="text" />
                </div>
                <div className="w-96 flex justify-between">
                  <span>Đã thanh toán</span> <NumberInput value={`${totalPaid}`} displayType="text" />
                </div>
              </div>
            </div>
          </CardItem>
        </form>

        <TMModal open={show} close={() => setShow(false)} width={600}>
          <div className="flex flex-col gap-2 w-full">
            <div className="py-4">
              <TextInput prefix={<Icon name="search" className="w-4" />} />
            </div>
            {data?.map((item, i: number) => {
              return (
                <React.Fragment key={item.documentId}>
                  {i !== 0 && <div className="bg-indigo-600 my-1 w-full h-[1px]" />}
                  <div className="flex gap-2">
                    <div>
                      <img src="https://placehold.co/60" />
                    </div>
                    <div>{item.name}</div>
                    <div className="ml-auto">
                      <TMButton onClick={() => handleAdd(item)}>Select</TMButton>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </TMModal>
      </BarcodeScanner>
    </div>
  );
}

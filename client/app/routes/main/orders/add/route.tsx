import { zodResolver } from "@hookform/resolvers/zod";
import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import { useEffect, useState } from "react";
import { Controller, FormProvider, useFieldArray, useForm } from "react-hook-form";
import { NumericFormat } from "react-number-format";
import { orderService } from "~/action.server/order.service";
import { BarcodeScanner } from "~/components/barcode-scanner";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { NumberInput } from "~/components/form/number-input";
import { TextInput } from "~/components/form/text-input";
import { Icon } from "~/components/icon";
import { TMButton } from "~/components/tm-button";
import { TMModal } from "~/components/tm-modal";
import { TMTable } from "~/components/tm-table";
import { orderSchema } from "~/constants/schema/order";
import { getSession } from "~/sessions";
import { IProduct } from "~/types/product";

interface IProductForm extends IProduct {
  price?: number | string;
  buyPrice?: number | string;
  productId: number | string;
}

export const meta: MetaFunction = () => {
  return [{ title: "New Remix App" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function OrderItem() {
  const fetcher = useFetcher();
  const [show, setShow] = useState(false);
  const searchFetcher = useFetcher<{ data: IProduct[] }>({ key: "Products-Search" });
  const formMethods = useForm({
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
  const { control, watch, getValues, setValue } = formMethods;
  const { fields, append, prepend, remove, swap, move, insert, replace } = useFieldArray<any>({
    control, // control props comes from useForm (optional: if you are using FormProvider)
    name: "OrderDetails", // unique name for your Field Array
  });
  const orderDetails = watch("OrderDetails");
  const surcharge = watch("surcharge");
  const VAT = watch("VAT");
  const [canScan, setCanScan] = useState(true);

  const controlledFields = fields.map((field, index) => {
    return {
      ...field,
      ...(orderDetails[index] as any),
    };
  });
  const handleError = (errors: any) => {
    console.log("errors", errors);
  };
  const onSubmit = (v: any): void => {
    // const qs = {
    //   quantity: v.quantity as string,
    //   warehouseId: warehouse?.documentId as string,
    //   vendorId: defaultActive?.documentId as string,
    // };
    // const { ...parsed } = v;
    // delete parsed.quantity;
    // delete parsed.warehouseId;
    // delete parsed.vendorId;
    // fetcher.submit(
    //   {
    //     data: JSON.stringify({
    //       data: parsed,
    //       qs: qs,
    //     }),
    //   },
    //   { method: "POST", action: "/products/add" }
    // );
    v.price = total;
    v.paid = totalPaid;
    console.log("v", v);
    fetcher.submit({ data: JSON.stringify(v) }, { method: "POST", action: "/orders/add" });
  };

  const handleAdd = (item: IProduct) => {
    const currentValue: IProductForm[] = getValues("OrderDetails");
    if (!currentValue.length) {
      const result = {
        productId: item.id,
        name: item.name,
        quantity: 1,
        price: Number(item.regularPrice),
        buyPrice: Number(item.regularPrice),
        note: "",
      };
      return append(result);
    } else {
      let index = currentValue.findIndex((cItem) => item.id === cItem.productId && cItem.productId);
      if (index === -1) {
        const result = {
          productId: item.id,
          name: item.name,
          quantity: 1,
          price: Number(item.regularPrice),
          buyPrice: Number(item.regularPrice),
          note: "",
        };
        return append(result);
      } else {
        const target = { ...currentValue[index] };
        const quantity = Number(target.quantity) + 1;
        target.quantity = quantity;
        target.buyPrice = quantity * Number(target.price);
        currentValue[index] = target;
        return replace(currentValue);
      }
    }
  };
  const onQuantityChange = ({ value, float }: any, field: any, pos: number) => {
    field.onChange(value);
    const price = getValues(`OrderDetails.${pos}.price` as any);
    const v = Number(value) * Number(price);
    setValue(`OrderDetails.${pos}.buyPrice` as any, v);
  };
  const onChangePrice = ({ value, float }: any, field: any, pos: number) => {
    field.onChange(value);
    const quantity = getValues(`OrderDetails.${pos}.quantity` as any);
    const v = Number(value) * Number(quantity);
    setValue(`OrderDetails.${pos}.buyPrice` as any, v);
  };
  const total = orderDetails?.reduce((total, item: IProductForm) => total + Number(item?.buyPrice), 0);
  let combineTotal = total + Number(surcharge);
  const totalPaid = Number(combineTotal + (combineTotal / 100) * Number(VAT));
  const handleRetrieveData = async (barcode: any) => {
    setCanScan(false);
    const item = data?.find((item: IProduct) => item.code == barcode);
    if (item) {
      handleAdd(item);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setCanScan(true);
  };

  const handleFilterProduct = (e: any) => {
    searchFetcher.submit({ s: e.target.value }, { method: "POST", action: "/products" });
  };
  const onQuantityIncreasement = (field: any, pos: number) => {
    const quantity = getValues(`OrderDetails.${pos}.quantity` as any);
    field.onChange(Number(quantity) + 1);
  };
  const onQuantityDecreasement = (field: any, pos: number) => {
    const quantity = getValues(`OrderDetails.${pos}.quantity` as any);
    const lastQuantity = Number(quantity) > 0 ? Number(quantity) - 1 : 0;
    field.onChange(lastQuantity);
  };
  useEffect(() => {
    (window as any).getValues = getValues;
  }, []);

  const data = searchFetcher?.data?.data || [];
  return (
    <div className="w-full flex flex-col p-4 gap-4">
      <BarcodeScanner onScan={handleRetrieveData} start={canScan}>
        <FormProvider {...formMethods}>
          <form className="flex gap-4 flex-col" onSubmit={formMethods.handleSubmit(onSubmit, handleError)}>
            <CardItem
              title={
                <div className="flex justify-between items-center">
                  <label className="text-lg">Hóa đơn</label>
                  <TMButton className="font-normal" onClick={() => setShow(true)}>
                    Chọn sản phẩm
                  </TMButton>
                </div>
              }
              className="min-h-80"
            >
              <div className="col-span-12 grid grid-cols-12 gap-2 py-2 mb-4 border-b-2 border-indigo-200">
                <div className="col-span-1 ">STT</div>
                <div className="col-span-4">Tên sản phẩm</div>
                <div className="col-span-2 ">Số lượng</div>
                <div className="col-span-2 text-right">Giá tiền</div>
                <div className="col-span-3 text-right">Tổng tiền</div>
              </div>
              <div className="min-h-40 max-h-[45vh] overflow-auto flex flex-col gap-4 py-2">
                {controlledFields?.map((field, i: number) => {
                  return (
                    <div className="grid grid-cols-12">
                      <div className="col-span-12 grid grid-cols-12 gap-2 items-center" key={field.id}>
                        <div className="hidden">
                          <Controller
                            control={control}
                            name={`OrderDetails.${i}.productId` as any}
                            render={({ field }) => {
                              return <TextInput {...field} readOnly />;
                            }}
                          />
                        </div>
                        <div className="col-span-1 px-2">
                          <div className="px-2">{i + 1}</div>
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
                                <div className="flex gap-1">
                                  <TMButton
                                    size="xs"
                                    variant="light"
                                    className="w-9 flex-shrink-0 !rounded-md"
                                    onClick={() => onQuantityDecreasement(field, i)}
                                  >
                                    -
                                  </TMButton>
                                  <NumberInput
                                    value={field.value as any}
                                    onValueChange={(v) => onQuantityChange(v, field, i)}
                                    style={{ margin: 0 }}
                                  />
                                  <TMButton
                                    size="xs"
                                    variant="light"
                                    className="w-9 flex-shrink-0 !rounded-md"
                                    onClick={() => onQuantityIncreasement(field, i)}
                                  >
                                    +
                                  </TMButton>
                                </div>
                              );
                            }}
                          />
                        </div>
                        <div className="col-span-2">
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
                        <div className="col-span-3 px-2 text-right">
                          <Controller
                            control={control}
                            name={`OrderDetails.${i}.buyPrice` as any}
                            render={({ field }) => {
                              return (
                                <NumberInput
                                  value={field.value as any}
                                  // onValueChange={(v, info) => {
                                  //   field.onChange(v.value);
                                  // }}
                                  displayType="text"
                                />
                              );
                            }}
                          />
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

                  <div className="h-[2px] bg-indigo-600 my-2" />

                  <div className="w-96 flex justify-end">
                    <TMButton htmlType="submit" size="md" variant="light">
                      Thêm
                    </TMButton>
                  </div>
                </div>
              </div>
            </CardItem>
          </form>
        </FormProvider>
        <TMModal open={show} close={() => setShow(false)} width={600}>
          <div className="flex flex-col gap-2 w-full  ">
            <div className="py-4">
              <TextInput prefix={<Icon name="search" className="w-4" />} onChange={handleFilterProduct} />
            </div>
            <div className="max-h-[50vh] overflow-auto">
              <TMTable
                columns={[
                  {
                    title: "Hình ảnh",
                    dataIndex: "image",
                    render: () => <img src="https://placehold.co/60" />,
                    width: 100,
                  },
                  { title: "Tên sản phẩm", dataIndex: "name" },
                  {
                    title: "Giá tiền",
                    dataIndex: "regularPrice",
                    render: (record) => (
                      <NumericFormat value={record.regularPrice} thousandSeparator="," displayType="text" />
                    ),
                  },
                  {
                    title: "Action",
                    dataIndex: "action",
                    width: 110,
                    render: (record) => (
                      <TMButton onClick={() => handleAdd(record)} variant="light">
                        Chọn
                      </TMButton>
                    ),
                  },
                ]}
                data={data}
                rowKey="id"
              />
            </div>
          </div>
        </TMModal>
      </BarcodeScanner>
    </div>
  );
}
export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const data: any = await formData.get("data");
  const dataJson = data ? JSON.parse(data) : {};
  const session = await getSession(request.headers.get("Cookie"));
  const warehouseId = session.get("warehouse");
  const params = {
    ...dataJson,
    warehouseId,
  };
  // console.log("params", params);
  // return true;
  const resp = await orderService.createOrder(params);
  return resp;
};
export function ErrorBoundary() {
  return <ErrorComponent />;
}

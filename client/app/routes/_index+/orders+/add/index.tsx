import { zodResolver } from "@hookform/resolvers/zod";
import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import { useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { orderService } from "~/action.server/order.service";
import { BarcodeScanner } from "~/components/barcode-scanner";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { FormControl } from "~/components/form/form-control";
import { FormInput } from "~/components/form/formInput";
import { NumberInput } from "~/components/form/number-input";
import { Icon } from "~/components/icon";
import { toast } from "~/components/notification";
import { OrderDetailFunction, OrderDetails } from "~/components/order-details";
import { ProductSearchModal } from "~/components/product-search-modal";
import { TMButton } from "~/components/tm-button";
import { IOrderDetailType, IOrderType, orderSchema } from "~/constants/schema/order";
import { useSubmitPromise } from "~/hooks";
import { parseCookieFromRequest } from "~/sessions";
import { IProduct } from "~/types/product";

export const meta: MetaFunction = () => {
  return [{ title: "New Remix App" }];
};

export default function OrderItem() {
  const [show, setShow] = useState(false);
  const searchFetcher = useFetcher<{ data: { data: IProduct[] } }>({ key: "Products-Search" });
  const formMethods = useForm<IOrderType>({
    defaultValues: {
      customer: undefined,
      orderDetails: [],
      price: 0,
      VAT: "5",
      surcharge: "0",
      paid: 0,
      paymentType: "cash",
    },
    resolver: zodResolver(orderSchema),
  });
  const { watch, getValues, setValue } = formMethods;
  const { submit, isLoading } = useSubmitPromise();
  const orderDetailsRef = useRef<OrderDetailFunction>(null);
  const orderDetails = watch("orderDetails") as IOrderDetailType[];
  const surcharge = watch("surcharge");
  const VAT = watch("VAT");
  const [canScan, setCanScan] = useState(true);
  const data = searchFetcher?.data?.data?.data || [];
  const handleError = (errors: any) => {
    console.log("errors", errors);
  };

  const total = orderDetails?.reduce((total, item: IOrderDetailType) => total + Number(item?.buyPrice), 0);
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

  const handleFilterProduct = (value: string) => {
    searchFetcher.submit({ s: value }, { method: "POST", action: "/products" });
  };

  const handleAdd = (item: IProduct) => {
    const currentValue: IOrderDetailType[] = getValues("orderDetails") || [];
    if (!currentValue.length) {
      const result = {
        productId: item.id,
        name: item.name,
        quantity: 1,
        price: Number(item.regularPrice),
        buyPrice: Number(item.regularPrice),
        note: "",
      };
      return orderDetailsRef.current?.append(result);
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
        return orderDetailsRef.current?.append(result);
      } else {
        const target = { ...currentValue[index] };
        const quantity = Number(target.quantity) + 1;
        target.quantity = quantity;
        target.buyPrice = quantity * Number(target.price);
        currentValue[index] = target;
        return orderDetailsRef.current?.replace(currentValue);
      }
    }
  };

  const onSubmit = async (v: IOrderType) => {
    try {
      const params = {
        ...v,
        price: total,
        paid: totalPaid,
      };
      const resp = await submit({ data: JSON.stringify(params) }, { method: "POST" });
      toast.success({ title: "Created", message: "Tạo đơn hàng thành công" });
    } catch (err) {
      console.log("error", err);
      toast.danger({ title: "Error", message: "Tạo đơn hàng thất bại" });
    }
  };

  return (
    <div className="w-full flex flex-col p-2 gap-4">
      <BarcodeScanner onScan={handleRetrieveData} start={canScan}>
        <FormProvider {...formMethods}>
          <form className="flex gap-4 flex-col" onSubmit={formMethods.handleSubmit(onSubmit, handleError)}>
            <CardItem
              title={
                <div className="flex justify-between items-center">
                  <label className="text-lg">Tạo đơn hàng</label>
                  <TMButton className="font-normal text-sm py-2" onClick={() => setShow(true)} size="xs">
                    <div className="flex gap-0.5 items-center">
                      <Icon name="plus" />
                      <span>Thêm sản phẩm</span>
                    </div>
                  </TMButton>
                </div>
              }
              className="min-h-80 p-4"
            >
              <div className="col-span-12 grid grid-cols-12 gap-2 py-2 mb-4 border-b border-indigo-600 dark:border-slate-400">
                <div className="col-span-1 ">STT</div>
                <div className="col-span-4">Tên sản phẩm</div>
                <div className="col-span-2 ">Số lượng</div>
                <div className="col-span-2 text-right">Giá tiền</div>
                <div className="col-span-3 text-right">Tổng tiền</div>
              </div>
              <div className="min-h-40 max-h-[45vh] overflow-auto flex flex-col gap-4 py-2">
                {/* {controlledFields?.map((field, i: number) => {
                  return (
                    <div className="grid grid-cols-12">
                      <div className="col-span-12 grid grid-cols-12 gap-2 items-center" key={field.id}>
                        <div className="hidden">
                          <FormInput name={`orderDetails.${i}.productId`}>
                            <TextInput readOnly />
                          </FormInput>
                        </div>
                        <div className="col-span-1 px-2">
                          <div className="px-2">{i + 1}</div>
                        </div>
                        <div className="col-span-4 ">
                          <FormInput name={`orderDetails.${i}.name`}>
                            <TextInput readOnly />
                          </FormInput>
                        </div>
                        <div className="col-span-2">
                          <FormInput name={`orderDetails.${i}.quantity` as any}>
                            {(field) => (
                              <div className="flex gap-1">
                                <TMButton
                                  size="xs"
                                  className="w-9 flex-shrink-0 !rounded-md"
                                  onClick={() => onQuantityDecreasement(field, i)}
                                >
                                  <Icon name="minus" />
                                </TMButton>
                                <NumberInput
                                  value={field.value as any}
                                  onValueChange={(v) => onQuantityChange(v, field, i)}
                                  style={{ margin: 0 }}
                                />
                                <TMButton
                                  size="xs"
                                  className="w-9 flex-shrink-0 !rounded-md"
                                  onClick={() => onQuantityIncreasement(field, i)}
                                >
                                  <Icon name="plus" />
                                </TMButton>
                              </div>
                            )}
                          </FormInput>
                        </div>
                        <div className="col-span-2">
                          <Controller
                            control={control}
                            name={`orderDetails.${i}.price` as any}
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
                          <FormInput name={`orderDetails.${i}.buyPrice` as any}>
                            <NumberInput displayType="text" />
                          </FormInput>
                        </div>
                      </div>
                    </div>
                  );
                })} */}
                <OrderDetails ref={orderDetailsRef} />
              </div>
              <div className="col-span-12 grid grid-cols-12 gap-2 py-4 mt-4 border-t border-indigo-200 dark:border-slate-400">
                <div className="col-span-12 ml-auto flex flex-col gap-1">
                  <div className="w-96 flex justify-between ">
                    <span>Tổng tiền</span>
                    <NumberInput value={`${total}`} displayType="text" />
                  </div>
                  <div className="w-96 flex justify-between">
                    <span>Phụ phí</span>{" "}
                    <div className="w-40">
                      <FormInput name="surcharge">
                        {(field) => <NumberInput onValueChange={(v) => field.onChange(v.value)} />}
                      </FormInput>
                    </div>
                  </div>
                  <div className="w-96 flex justify-between">
                    <span> VAT </span>
                    <div className="w-40">
                      <FormControl name="VAT">
                        {(field) => (
                          <NumberInput
                            maxLength={4}
                            max={1000}
                            value={`${field.value}`}
                            onValueChange={(v) => field.onChange(v.value)}
                            suffix="%"
                          />
                        )}
                      </FormControl>
                    </div>
                  </div>
                  <div className="w-96 flex justify-between">
                    <span>Tổng tiền đơn hàng </span>
                    <NumberInput value={`${totalPaid}`} displayType="text" />
                  </div>
                  <div className="h-[2px] border-t border-indigo-600 dark:border-slate-400 my-2" />
                  <div className="w-96 flex justify-between font-bold">
                    <span>Tổng phải thu</span> <NumberInput value={`${totalPaid}`} displayType="text" />
                  </div>
                  <div className="w-96 flex justify-between">
                    <span>Đã thanh toán</span> <NumberInput value={`${totalPaid}`} displayType="text" />
                  </div>

                  <div className="h-[2px] border-t border-indigo-600 dark:border-slate-400 my-2" />

                  <div className="w-96 flex justify-end">
                    <TMButton htmlType="submit" size="md" variant="light" loading={isLoading}>
                      Tạo đơn hàng
                    </TMButton>
                  </div>
                </div>
              </div>
            </CardItem>
          </form>
        </FormProvider>
        <ProductSearchModal
          data={data}
          close={() => setShow(false)}
          show={show}
          onSearch={handleFilterProduct}
          onSelect={handleAdd}
        />
      </BarcodeScanner>
    </div>
  );
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const data: any = await formData.get("data");
  const dataJson = data ? JSON.parse(data) : {};
  const { warehouseId, cookie } = await parseCookieFromRequest(request);
  const params = {
    ...dataJson,
    warehouseId,
    cookie,
  };
  const resp = await orderService.createOrder(params);
  return resp;
};
export function ErrorBoundary() {
  return <ErrorComponent />;
}

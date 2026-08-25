import { useRef, useState } from "react";
import { FieldErrors, useFormContext } from "react-hook-form";
import { BarcodeScanner } from "~/components/barcode-scanner";
import { OrderDetailFunction, OrderDetails } from "~/components/order-details";
import { ProductSearchModal } from "~/components/product-search-modal";
import { OrderDetailSchema, OrderSchema } from "~/constants/schema/order";
import { useTranslation } from "~/i18n";
import { IProduct } from "~/types/product";
import { NumberInput } from "../number-input";
import { FormInput } from "../formInput";
import { FormControl } from "../form-control";
import { TMButton } from "~/components/tm-button";
import { SelectInput } from "../select-input";
import { IProvider } from "~/types/provider";

interface Props {
  addProduct: (product: IProduct) => void;
  products: IProduct[];
  onSubmit: (values: OrderSchema & { price: number; paid: number }) => void;
  onError: (errors: FieldErrors<OrderSchema>) => void;
  onProductFilter: (value: string) => void;
  isLoading: boolean;
  providers?: IProvider[];
  submitLabel?: string;
}
export const OrderForm = ({
  onSubmit,
  onError,
  addProduct,
  onProductFilter,
  products,
  isLoading,
  providers,
  submitLabel,
}: Props) => {
  const { t } = useTranslation();
  const [canScan, setCanScan] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const form = useFormContext<OrderSchema>();
  const orderDetailsRef = useRef<OrderDetailFunction>(null);
  if (!form) throw new Error("Component must be used within a FormProvider");

  const orderDetails = form.watch("orderDetails") as OrderDetailSchema[];
  const surcharge = form.watch("surcharge");
  const VAT = form.watch("VAT");
  const total = orderDetails?.reduce((total, item: OrderDetailSchema) => total + Number(item?.buyPrice), 0);
  const combineTotal = total + Number(surcharge);
  const totalPaid = Number(combineTotal + (combineTotal / 100) * Number(VAT));

  const handleRetrieveData = async (barcode: any) => {
    setCanScan(false);
    const item = products?.find((item: IProduct) => item.code == barcode);
    if (item) {
      addProduct(item);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setCanScan(true);
  };
  const onHandleSubmit = (values: OrderSchema) => {
    const params = {
      ...values,
      price: total,
      paid: totalPaid,
    };
    onSubmit(params);
  };

  return (
    <div className="w-full flex flex-col p-2 gap-4">
      <BarcodeScanner onScan={handleRetrieveData} start={canScan}>
        <form className="grid grid-cols-12 gap-4" onSubmit={form.handleSubmit(onHandleSubmit, onError)}>
          <div className="col-span-12 grid grid-cols-12 gap-2 py-2 bg-slate-100">
            <div className="col-span-1 px-2">{t("importOrder.stt")}</div>
            <div className="col-span-4 px-2">{t("importOrder.product")}</div>
            <div className="col-span-2 px-2 ">{t("importOrder.quantity")}</div>
            <div className="col-span-2 px-2 text-right">{t("importOrder.price")}</div>
            <div className="col-span-3 px-2 text-right">{t("importOrder.total")}</div>
          </div>
          <div className="col-span-12">
            <OrderDetails ref={orderDetailsRef} addProduct={() => setShowModal(true)} />
          </div>
          <div className="col-span-12 grid grid-cols-12 gap-2 py-4 mt-4 border-t border-indigo-200 dark:border-slate-400">
            {providers?.length ? (
              <div className="col-span-12 max-w-[200px]">
                <FormControl name="providerId">
                  {(field) => {
                    return (
                      <SelectInput
                        options={providers?.map((item) => ({ label: item.name, value: item.id })) || []}
                        {...field}
                        label={t("importOrder.provider")}
                        onSelect={(v) => field.onChange(v)}
                      />
                    );
                  }}
                </FormControl>
              </div>
            ) : (
              ""
            )}
            <div className="col-span-12 max-w-[200px]">
              <FormControl name="paymentType">
                {(field) => {
                  return (
                    <SelectInput
                      options={[
                        { label: t("invoices.detail.cash"), value: "cash" },
                        { label: t("invoices.detail.transfer"), value: "transfer" },
                        { label: t("invoices.detail.credit"), value: "credit" },
                      ]}
                      {...field}
                      label={t("invoices.detail.paymentType")}
                      onSelect={(v) => field.onChange(v)}
                    />
                  );
                }}
              </FormControl>
            </div>
            <div className="col-span-12 ml-auto flex flex-col gap-1">
              <div className="w-96 flex justify-between ">
                <span>{t("importOrder.total")}</span>
                <NumberInput value={`${total}`} displayType="text" />
              </div>
              <div className="w-96 flex justify-between">
                <span>{t("importOrder.surcharge")}</span>{" "}
                <div className="w-40">
                  <FormInput name="surcharge">
                    {(field) => <NumberInput onValueChange={(v) => field.onChange(v.value)} />}
                  </FormInput>
                </div>
              </div>
              <div className="w-96 flex justify-between">
                <span> {t("importOrder.VAT")} </span>
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
                <span>{t("importOrder.orderTotal")} </span>
                <NumberInput value={`${totalPaid}`} displayType="text" />
              </div>
              <div className="h-[2px] border-t border-indigo-600 dark:border-slate-400 my-2" />
              <div className="w-96 flex justify-between font-bold">
                <span>{t("importOrder.totalPayable")}</span> <NumberInput value={`${totalPaid}`} displayType="text" />
              </div>
              <div className="w-96 flex justify-between">
                <span>{t("importOrder.paid")}</span> <NumberInput value={`${totalPaid}`} displayType="text" />
              </div>
              <div className="h-[2px] border-t border-indigo-600 dark:border-slate-400 my-2" />
              <div className="w-96 flex justify-end">
                <TMButton htmlType="submit" size="md" variant="light" loading={isLoading}>
                  {submitLabel || t("importOrder.createOrder")}
                </TMButton>
              </div>
            </div>
          </div>
        </form>
        <ProductSearchModal
          data={products}
          close={() => setShowModal(false)}
          show={showModal}
          onSearch={onProductFilter}
          onSelect={addProduct}
        />
      </BarcodeScanner>
    </div>
  );
};

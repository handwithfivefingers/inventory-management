import { useRef, useState } from "react";
import { FieldErrors, useFormContext } from "react-hook-form";
import { BarcodeScanner } from "~/components/barcode-scanner";
import { OrderDetailFunction, OrderDetails } from "~/components/order-details";
import { ProductSearchModal } from "~/components/product-search-modal";
import { OrderDetailSchema, OrderSchema } from "~/constants/schema/order";
import { useTranslation } from "~/i18n";
import { IProduct } from "~/types/product";
import { NumberInput } from "../number-input";
import { FormControl } from "../form-control";
import { TMButton } from "~/components/tm-button";
import { SelectInput } from "../select-input";
import { IProvider } from "~/types/provider";
import { Divider } from "~/components/divider";

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
    <div className="w-full flex flex-col gap-4 ">
      <BarcodeScanner onScan={handleRetrieveData} start={canScan}>
        <form className="flex gap-2 flex-col" onSubmit={form.handleSubmit(onHandleSubmit, onError)}>
          <div className="flex gap-2">
            <div className="flex-1 bg-slate-200/30 rounded ">
              <OrderDetails ref={orderDetailsRef} addProduct={() => setShowModal(true)} />
            </div>
            <div className="flex flex-col gap-2 w-xs p-4 bg-slate-200/30 rounded-md">
              {/* <div className="flex justify-between ">
                <span className="text-sm">{t("importOrder.total")}</span>
                <NumberInput value={`${total}`} displayType="text" />
              </div> */}
              <div className="flex justify-between">
                <span className="text-sm">{t("importOrder.surcharge")}</span>{" "}
                <div className="w-40">
                  <FormControl name="surcharge">
                    {(field) => <NumberInput onValueChange={(v) => field.onChange(v.value)} />}
                  </FormControl>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-sm"> {t("importOrder.VAT")} </span>
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
              {/* <div className="flex justify-between">
                <span className="text-sm">{t("importOrder.orderTotal")} </span>
                <NumberInput value={`${totalPaid}`} displayType="text" />
              </div> */}
              <Divider />

              <div className="flex justify-between font-bold">
                <span className="text-sm">{t("importOrder.totalPayable")}</span>{" "}
                <NumberInput value={`${totalPaid}`} displayType="text" />
              </div>
              <div className="flex justify-between">
                <span className="text-sm">{t("importOrder.paid")}</span>{" "}
                <NumberInput value={`${totalPaid}`} displayType="text" />
              </div>

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

              <Divider />
              <div className="flex justify-end">
                <TMButton htmlType="submit" size="sm" variant="light" loading={isLoading}>
                  {submitLabel || t("importOrder.createOrder")}
                </TMButton>
              </div>
            </div>
          </div>
          <div>
            {providers?.length ? (
              <div className="max-w-[200px]">
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

import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { importOrderService } from "~/action.server/importOrder.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { OrderForm } from "~/components/form/order-form";
import { Icon } from "~/components/icon";
import { toast } from "~/components/notification";
import { VariantPickerModal } from "~/components/variant-picker-modal";
import { OrderDetailSchema, OrderSchema, orderSchema } from "~/constants/schema/order";
import { useTranslation } from "~/i18n";
import { IProduct, IProductVariant } from "~/types/product";
import { IProvider } from "~/types/provider";

export const meta: MetaFunction = () => {
  return [{ title: "Tạo phiếu nhập" }, { name: "description", content: "Tạo phiếu nhập hàng" }];
};

export default function OrderItem() {
  const { t } = useTranslation();
  const fetcher = useFetcher();
  const searchFetcher = useFetcher<{ data: IProduct[] }>({ key: "Products-Search" });

  const form = useForm<OrderSchema>({
    defaultValues: {
      customer: undefined,
      orderDetails: [],
      price: 0,
      VAT: "5",
      surcharge: "0",
      paid: 0,
      paymentType: "cash",
      providerId: undefined,
    },
    resolver: orderSchema,
  });

  const variantsFetcher = useFetcher<{ data: { data: IProductVariant[]; total: number } }>({
    key: "Product-Variants",
  });
  const [variantTarget, setVariantTarget] = useState<IProduct | null>(null);
  const [showVariantPicker, setShowVariantPicker] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { load: loadProvider, data: providers } = useFetcher<{ data: IProvider[] }>({ key: "providers" });

  const addLine = (
    currentValue: OrderDetailSchema[],
    line: Omit<OrderDetailSchema, "quantity"> & { quantity?: number | string },
  ): OrderDetailSchema[] => {
    const result = {
      ...line,
      quantity: line.quantity ?? 1,
      buyPrice: Number(line.price),
    } as OrderDetailSchema;
    if (!currentValue.length) return [result];
    const index = currentValue.findIndex(
      (cItem) =>
        cItem.productId === result.productId && (cItem.variantId ?? undefined) === (result.variantId ?? undefined),
    );
    if (index === -1) {
      currentValue.push(result);
    } else {
      const target = { ...currentValue[index] };
      target.quantity = Number(target.quantity) + 1;
      target.buyPrice = Number(target.quantity) * Number(target.price);
      currentValue[index] = target;
    }
    return currentValue;
  };

  const onSubmit = (v: any): void => {
    fetcher.submit({ data: JSON.stringify(v) }, { method: "POST", action: "/import-order/add" });
  };

  const pickVariant = (variant: IProductVariant) => {
    if (!variantTarget) return;
    const price = Number(variant.salePrice ?? variantTarget.regularPrice ?? 0);
    form.setValue(
      "orderDetails",
      addLine(form.getValues("orderDetails") || [], {
        productId: variantTarget.id,
        variantId: variant.id,
        name: `${variantTarget.name} (${(variant.attributeValues || []).map((v: any) => v.value).join(" / ")})`,
        price,
        note: "",
      }),
    );
    setShowVariantPicker(false);
    setVariantTarget(null);
  };

  const handleAdd = (item: IProduct) => {
    // Variable products need a specific variant before a line can be added
    if (Number((item as any).variantCount) > 0) {
      setVariantTarget(item);
      setShowVariantPicker(true);
      variantsFetcher.submit({ variantOf: String(item.id) }, { method: "POST", action: "/products" });
      return;
    }
    form.setValue(
      "orderDetails",
      addLine(form.getValues("orderDetails") || [], {
        productId: item.id,
        name: item.name,
        price: Number(item.regularPrice),
        note: "",
      }),
    );
  };
  const handleFilterProduct = (e: any) => {
    searchFetcher.submit({ s: e.target.value }, { method: "POST", action: "/products" });
  };

  const handleError = () => {
    toast.danger({ title: t("common.error"), message: t("common.tryAgain") });
  };

  useEffect(() => {
    loadProvider("/providers");
  }, []);

  const data = searchFetcher?.data?.data || [];

  return (
    <FormProvider {...form}>
      <div className="w-full flex flex-col p-3 gap-3 overflow-auto h-full bg-slate-50/50 dark:bg-transparent">
        <div className="max-w-5xl w-full mx-auto">
          <CardItem
            title={
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                    <Icon name="package" fontSize={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">
                      {t("importOrder.add")}
                    </h2>
                    <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">Tạo phiếu nhập hàng</p>
                  </div>
                </div>
              </div>
            }
            className="p-5 sm:p-6"
          >
            <OrderForm
              products={data}
              addProduct={handleAdd}
              onProductFilter={handleFilterProduct}
              isLoading={fetcher.state !== "idle"}
              onSubmit={onSubmit}
              onError={handleError}
              providers={[...(providers?.data || [])]}
            />
            <VariantPickerModal
              show={showVariantPicker}
              close={() => {
                setShowVariantPicker(false);
                setVariantTarget(null);
              }}
              product={variantTarget}
              variants={variantsFetcher?.data?.data?.data || []}
              loading={variantsFetcher.state !== "idle"}
              onSelect={pickVariant}
            />
          </CardItem>
        </div>
      </div>
    </FormProvider>
  );
}
export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const data: any = await formData.get("data");
  const dataJson = data ? JSON.parse(data) : {};
  const { warehouseId, vendorId, cookie } = await import("~/sessions").then((m) => m.parseCookieFromRequest(request));
  const params = {
    ...dataJson,
    warehouseId,
    vendorId,
    cookie,
  };
  const resp = await importOrderService.createOrder(params);
  return resp;
};
export function ErrorBoundary() {
  return <ErrorComponent />;
}

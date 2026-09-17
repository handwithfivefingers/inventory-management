import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useFetcher, useNavigate, useOutletContext } from "@remix-run/react";
import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { orderService } from "~/action.server/order.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { OrderForm } from "~/components/form/order-form";
import { toast } from "~/components/notification";
import { TMButton } from "~/components/tm-button";
import { VariantPickerModal } from "~/components/variant-picker-modal";
import { OrderDetailSchema, OrderSchema, orderSchema } from "~/constants/schema/order";
import { useSubmitPromise } from "~/hooks";
import { useUnifiedProductSearch } from "~/hooks/use-unified-product-search";
import { useTranslation } from "~/i18n";
import { IProduct, IProductSearchRow, IProductVariant } from "~/types/product";
import { MainLayoutContext } from "../_layout";
import { debounce } from "~/libs/debounce";

export const meta: MetaFunction = () => {
  return [{ title: "Bán hàng (POS)" }];
};

/**
 * POS page: 2 panes (product list + cart/payment via shared OrderForm).
 * channel is fixed to POS — backend creates Order + FULL invoice + ledger
 * inside ONE transaction (attemptCreateInvoice runs in the same tx).
 */
export default function SellPage() {
  const { setOpenSidebar, settings } = useOutletContext<MainLayoutContext>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const form = useForm<OrderSchema>({
    defaultValues: {
      customer: undefined,
      orderDetails: [],
      price: 0,
      VAT: settings.defaultTaxRate ?? 0,
      surcharge: "0",
      paid: 0,
      paymentType: "cash",
      channel: "POS",
    },
    resolver: orderSchema,
  });
  const { submit, isLoading } = useSubmitPromise();
  // Unified POS search: exact barcode/SKU scans auto-add to cart, otherwise
  // variant-level rows come back for fast checkout (real-time stock).
  const { rows: searchedRows, search: searchProducts } = useUnifiedProductSearch({
    context: "POS",
    onExactMatch: (item) => {
      form.setValue(
        "orderDetails",
        addLine(form.getValues("orderDetails") || [], {
          productId: item.product_id,
          variantId: item.variant_id,
          name: item.display_name,
          price: item.price,
          note: "",
        }),
      );
    },
  });
  const data = searchedRows;

  const variantsFetcher = useFetcher<{ data: { data: IProductVariant[]; total: number } }>({
    key: "Product-Variants",
  });
  const [variantTarget, setVariantTarget] = useState<IProduct | null>(null);
  const [showVariantPicker, setShowVariantPicker] = useState(false);

  const handleFilterProduct = debounce((value: string) => {
    searchProducts(value);
  }, 250);

  const addLine = (
    currentValue: OrderDetailSchema[],
    line: Omit<OrderDetailSchema, "quantity"> & { quantity?: number | string },
  ): OrderDetailSchema[] => {
    const result = { ...line, quantity: line.quantity ?? 1, buyPrice: Number(line.price) } as OrderDetailSchema;
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

  const handleAdd = (item: IProduct, variant?: IProductVariant) => {
    // Unified POS rows already carry their actionable variant — add directly.
    const unifiedVariant = (item as IProductSearchRow).unifiedVariant ?? variant;
    if (unifiedVariant && (item as IProductSearchRow).unifiedVariant) {
      const price = Number(unifiedVariant.salePrice ?? unifiedVariant.regularPrice ?? item.regularPrice ?? 0);
      form.setValue(
        "orderDetails",
        addLine(form.getValues("orderDetails") || [], {
          productId: item.id,
          variantId: unifiedVariant.id,
          name: item.name,
          price,
          note: "",
        }),
      );
      return;
    }
    if (variant) {
      const price = Number(variant.salePrice ?? variant.regularPrice ?? item.regularPrice ?? 0);
      form.setValue(
        "orderDetails",
        addLine(form.getValues("orderDetails") || [], {
          productId: item.id,
          variantId: variant.id,
          name: `${item.name} (${
            (variant.attributeValues || [])
              .map((v: any) => v.value)
              .filter(Boolean)
              .join(" / ") || variant.skuCode
          })`,
          price,
          note: "",
        }),
      );
      return;
    }
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

  const onSubmit = async (v: OrderSchema) => {
    try {
      const resp = await submit<{ status: number; orderId?: number }>(
        { data: JSON.stringify({ ...v, channel: "POS" }) },
        { method: "POST" },
      );
      if (resp.status === 200 && resp.orderId) {
        toast.success({ title: "Success", message: "Thanh toán thành công" });
        navigate(`/orders/${resp.orderId}`);
        return;
      }
      throw resp;
    } catch (err) {
      console.log("POS checkout error", err);
      toast.danger({ title: "Error", message: "Thanh toán thất bại" });
    }
  };

  useEffect(() => {
    setOpenSidebar(false);
    return () => {
      setOpenSidebar(true);
    };
  }, []);

  return (
    <FormProvider {...form}>
      <div className="w-full flex flex-col p-3 gap-3 overflow-auto h-full bg-slate-50/50 dark:bg-transparent">
        <div className="w-full mx-auto flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-lg font-semibold">Bán hàng (POS)</h1>
            <Link to="/orders/add">
              <TMButton variant="outline" size="xs" type="button">
                {t("orders.createWholesale", { defaultValue: "Tạo đơn sỉ / online" })}
              </TMButton>
            </Link>
          </div>
          <CardItem
            title={<span className="text-sm text-slate-500">Kênh: POS — hóa đơn FULL tạo cùng lúc với đơn hàng</span>}
            className="flex flex-col w-full rounded-md bg-white shadow-2xl shadow-slate-200 gap-2 dark:bg-slate-800 p-5 sm:p-6 h-full"
          >
            <OrderForm
              products={data}
              addProduct={handleAdd}
              onProductFilter={handleFilterProduct}
              isLoading={isLoading}
              onSubmit={onSubmit}
              onError={(e) => console.log("errors", e)}
              fixedChannel="POS"
              submitLabel={t("sell.checkout", { defaultValue: "Thanh toán" })}
            />
          </CardItem>
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
        </div>
      </div>
    </FormProvider>
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const data: any = await formData.get("data");
  const dataJson = data ? JSON.parse(data) : {};
  // const { warehouseId, vendorId, cookie } = await parseCookieFromRequest(request);
  const params = { ...dataJson, channel: "POS" };
  const resp = await orderService.createOrder(params);
  if (resp.status === 200) {
    // Backend POST /orders/create -> 200 { data: order }. HTTPService wraps as
    // { data: backendJson, status }, so payload = { data: order }.
    const payload: any = (resp as any)?.data;
    const order = payload?.data?.order ?? payload?.data ?? payload?.order ?? payload;
    return Response.json({ orderId: order?.id, status: 200 });
  }
  return Response.json({ ...resp, status: 400 }, { status: 400 });
}

export function ErrorBoundary() {
  return <ErrorComponent />;
}

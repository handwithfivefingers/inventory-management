import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { FieldErrors, useFormContext } from "react-hook-form";
import { BarcodeScanner } from "~/components/barcode-scanner";
import { Icon } from "~/components/icon";
import { OrderDetails } from "~/components/order-details";
import { OrderDetailSchema, OrderSchema } from "~/constants/schema/order";
import { useTranslation } from "~/i18n";
import { formatCurrency } from "~/libs/format-currency";
import { cn } from "~/libs/utils";
import { IProduct, IProductVariant } from "~/types/product";
import { NumberInput } from "../number-input";
import { FormControl } from "../form-control";
import { TMButton } from "~/components/tm-button";
import { SelectInput } from "../select-input";
import { IProvider } from "~/types/provider";
import { Divider } from "~/components/divider";
import { TextInput } from "../text-input";

const CHANNELS = ["WHOLESALE", "ONLINE", "POS"] as const;

interface Props {
  addProduct: (product: IProduct, variant?: IProductVariant) => void;
  products: IProduct[];
  onSubmit: (values: OrderSchema & { price: number; paid: number }) => void;
  onError: (errors: FieldErrors<OrderSchema>) => void;
  onProductFilter: (value: string) => void;
  isLoading: boolean;
  providers?: IProvider[];
  submitLabel?: string;
  /** When set (POS page), channel is fixed and the selector is hidden. */
  fixedChannel?: (typeof CHANNELS)[number];
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
  fixedChannel,
}: Props) => {
  const { t } = useTranslation();
  const [canScan, setCanScan] = useState(true);
  const [scanValue, setScanValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const pendingScanRef = useRef<string | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const form = useFormContext<OrderSchema>();
  if (!form) throw new Error("Component must be used within a FormProvider");

  const orderDetails = form.watch("orderDetails") as OrderDetailSchema[];
  const surcharge = form.watch("surcharge");
  const VAT = form.watch("VAT");
  const total = orderDetails?.reduce((total, item: OrderDetailSchema) => total + Number(item?.buyPrice), 0);
  const combineTotal = total + Number(surcharge);
  const totalPaid = Number(combineTotal + (combineTotal / 100) * Number(VAT));

  const normalizeScan = (value: string | null | undefined) => `${value || ""}`.trim().toLowerCase();
  const variantLabel = (variant: IProductVariant) =>
    (variant.attributeValues || [])
      .map((v: any) => v.value)
      .filter(Boolean)
      .join(" / ");
  const variantStock = (variant: IProductVariant) =>
    variant.inventories?.reduce((sum, inventory) => sum + Number(inventory.quantity || 0), 0) ??
    Number(variant.quantity ?? 0);
  const canPickProduct = (product: IProduct) =>
    Number(product.quantity ?? 0) > 0 || !!product.isNegative || Number(product.variantCount || 0) > 0;
  const canPickVariant = (variant: IProductVariant) => variantStock(variant) > 0 || !!(variant as any).isNegative;

  const findExactMatch = (barcode: string) => {
    const scan = barcode.trim().toLowerCase();
    for (const product of products || []) {
      const variant = product.variants?.find(
        (item) => normalizeScan(item.code) === scan || normalizeScan(item.skuCode) === scan,
      );
      if (variant) return { product, variant };
      if (normalizeScan(product.code) === scan || normalizeScan(product.skuCode) === scan) return { product };
    }
    return null;
  };

  const filteredProducts = useMemo(() => {
    const query = normalizeScan(scanValue);
    if (!query) return [];
    return (products || []).filter(
      (product) =>
        normalizeScan(product.name).includes(query) ||
        normalizeScan(product.code).includes(query) ||
        normalizeScan(product.skuCode).includes(query) ||
        product.variants?.some(
          (variant) =>
            normalizeScan(variant.code).includes(query) ||
            normalizeScan(variant.skuCode).includes(query) ||
            variantLabel(variant).toLowerCase().includes(query),
        ),
    );
  }, [products, scanValue]);

  const handleRetrieveData = async (barcode: string) => {
    const scan = `${barcode || ""}`.trim();
    if (!scan) return;
    setCanScan(false);
    const match = findExactMatch(scan);
    if (match) {
      addProduct(match.product, match.variant);
      pendingScanRef.current = null;
      setScanValue("");
      setShowDropdown(false);
    } else {
      pendingScanRef.current = scan;
      onProductFilter(scan);
      setShowDropdown(true);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setCanScan(true);
  };

  const selectProduct = (product: IProduct, variant?: IProductVariant) => {
    addProduct(product, variant);
    setScanValue("");
    setShowDropdown(false);
    pendingScanRef.current = null;
    scanInputRef.current?.focus();
  };

  useEffect(() => {
    const pendingScan = pendingScanRef.current;
    if (!pendingScan || !products?.length) return;
    const match = findExactMatch(pendingScan);
    if (!match) return;
    addProduct(match.product, match.variant);
    pendingScanRef.current = null;
    setScanValue("");
    setShowDropdown(false);
    scanInputRef.current?.focus();
  }, [products]);

  const onHandleSubmit = (values: OrderSchema) => {
    const params = {
      ...values,
      price: total,
      paid: totalPaid,
    };
    onSubmit(params);
  };

  const channel = form.watch("channel" as any) as string | undefined;
  useEffect(() => {
    if (fixedChannel) form.setValue("channel" as any, fixedChannel as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixedChannel]);

  return (
    <div className="w-full flex flex-col gap-4 ">
      {!fixedChannel && (
        <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="channel">
          <span className="text-sm text-slate-500">{t("orders.channel", { defaultValue: "Kênh:" })}</span>
          <div className="flex">
            {CHANNELS.filter((c) => c !== "POS").map((c, i) => {
              const active = (channel ?? "WHOLESALE") === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => form.setValue("channel" as any, c as any)}
                  className={cn("px-3 py-1.5 text-sm border transition-colors cursor-pointer", {
                    ["rounded-l-lg"]: i === 0,
                    ["rounded-r-lg"]: i === 1,
                    ["bg-indigo-600 text-white border-indigo-600"]: active,
                    ["bg-white text-slate-600 border-slate-200 hover:border-indigo-400 dark:bg-slate-800 dark:text-slate-300"]:
                      !active,
                  })}
                >
                  {t(`orders.channels.${c.toLowerCase()}`, { defaultValue: c })}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {/* <BarcodeScanner onScan={handleRetrieveData} start={canScan}> */}
      <form className="flex gap-2 flex-col" onSubmit={form.handleSubmit(onHandleSubmit, onError)}>
        <div className="relative">
          <TextInput
            ref={scanInputRef}
            inputSize="sm"
            prefix={<Icon name="search" className="w-4" />}
            suffix={
              <div className="w-4">
                <QRIcon />
              </div>
            }
            placeholder="Barcode/SKU/Name"
            value={scanValue}
            autoComplete="off"
            onFocus={() => scanValue.trim() && setShowDropdown(true)}
            onInput={(e: FormEvent<HTMLInputElement>) => {
              const value = e.currentTarget.value;
              const scan = value.trim();
              const match = findExactMatch(scan);
              if (match) {
                selectProduct(match.product, match.variant);
                return;
              }
              setScanValue(value);
              pendingScanRef.current = scan || null;
              setShowDropdown(!!scan);
              onProductFilter(value);
            }}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              handleRetrieveData(e.currentTarget.value);
            }}
            onBlur={() => setTimeout(() => setShowDropdown(false), 100)}
          />
          {showDropdown && (
            <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
              {filteredProducts.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-slate-400">Không có sản phẩm phù hợp</div>
              ) : (
                filteredProducts.map((product) => {
                  const hasVariants = Number(product.variantCount || 0) > 0 || !!product.variants?.length;
                  const productPickable = canPickProduct(product);
                  return (
                    <div key={product.id} className="border-b border-slate-100 last:border-b-0 dark:border-slate-700">
                      <button
                        type="button"
                        disabled={!productPickable}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => productPickable && selectProduct(product)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                          productPickable
                            ? "hover:bg-indigo-50 dark:hover:bg-slate-700"
                            : "opacity-45 cursor-not-allowed",
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{product.name}</div>
                          <div className="text-xs text-slate-400">
                            {product.skuCode || product.code || `#${product.id}`}
                          </div>
                        </div>
                        <div className="w-24 shrink-0 text-right text-sm">
                          {formatCurrency(product.salePrice ?? product.regularPrice ?? 0)}
                        </div>
                        {hasVariants && <div className="text-xs text-primary shrink-0">Biến thể</div>}
                      </button>
                      {product.variants?.map((variant) => {
                        const pickable = canPickVariant(variant);
                        const stock = variantStock(variant);
                        return (
                          <button
                            key={variant.id}
                            type="button"
                            disabled={!pickable}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectProduct(product, variant)}
                            className={cn(
                              "w-full flex items-center gap-3 px-6 py-2 text-left text-sm transition-colors",
                              pickable ? "hover:bg-indigo-50 dark:hover:bg-slate-700" : "opacity-45 cursor-not-allowed",
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="truncate">{variantLabel(variant) || variant.skuCode}</div>
                              <div className="text-xs text-slate-400">
                                {variant.skuCode || variant.code || `#${variant.id}`}
                              </div>
                            </div>
                            <div className="w-24 shrink-0 text-right">
                              {formatCurrency(variant.salePrice ?? variant.regularPrice ?? product.regularPrice ?? 0)}
                            </div>
                            <div
                              className={cn(
                                "w-16 shrink-0 text-right text-xs",
                                stock <= 0 ? "text-red-500" : "text-slate-500",
                              )}
                            >
                              {stock}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-col lg:flex-row">
          <div className="flex-1 min-w-0 bg-slate-200/30 rounded overflow-x-auto">
            <OrderDetails addProduct={() => scanInputRef.current?.focus()} />
          </div>
          <div className="flex flex-col gap-2 w-full lg:w-80 lg:max-w-xs shrink-0 p-4 bg-slate-200/30 rounded-md">
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
                      {
                        label: t("invoices.detail.transfer"),
                        value: "transfer",
                      },
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
                      options={
                        providers?.map((item) => ({
                          label: item.name,
                          value: item.id,
                        })) || []
                      }
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
      {/* </BarcodeScanner> */}
    </div>
  );
};

const QRIcon = () => {
  return (
    <svg viewBox="0 0 24 24" width="100%" fill="currentColor">
      <path
        fill="currentColor"
        d="M2,6H4V18H2V6M5,6H6V18H5V6M7,6H10V18H7V6M11,6H12V18H11V6M14,6H16V18H14V6M17,6H20V18H17V6M21,6H22V18H21V6Z"
      ></path>
    </svg>
  );
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="100%" fill="currentColor" viewBox="0 0 16 16">
      <path d="M2 2h2v2H2z"></path>
      <path d="M6 0v6H0V0zM5 1H1v4h4zM4 12H2v2h2z"></path>
      <path d="M6 10v6H0v-6zm-5 1v4h4v-4zm11-9h2v2h-2z"></path>
      <path d="M10 0v6h6V0zm5 1v4h-4V1zM8 1V0h1v2H8v2H7V1zm0 5V4h1v2zM6 8V7h1V6h1v2h1V7h5v1h-4v1H7V8zm0 0v1H2V8H1v1H0V7h3v1zm10 1h-1V7h1zm-1 0h-1v2h2v-1h-1zm-4 0h2v1h-1v1h-1zm2 3v-1h-1v1h-1v1H9v1h3v-2zm0 0h3v1h-2v1h-1zm-4-1v1h1v-2H7v1z"></path>
      <path d="M7 12h1v3h4v1H7zm9 2v2h-3v-1h2v-1z"></path>
    </svg>
  );
};

import { zodResolver } from "@hookform/resolvers/zod";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData, useOutletContext } from "@remix-run/react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { categoryService } from "~/action.server/category.service";
import { productService } from "~/action.server/products.service";
import { IVendorSettings } from "~/action.server/setting.service";
import { tagsService } from "~/action.server/tags.service";
import { unitsService } from "~/action.server/units.service";
import { CardItem } from "~/components/card-item";
import { CheckboxInput } from "~/components/form/checkbox-input";
import { FormControl } from "~/components/form/form-control";
import { MultiSelectInput } from "~/components/form/multi-select-input";
import { NumberStepper } from "~/components/form/number-stepper";
import { NumberInput } from "~/components/form/number-input";
import { SelectInput } from "~/components/form/select-input";
import { TextInput } from "~/components/form/text-input";
import { VariantEditor } from "~/components/form/variant-editor";
import { Tab } from "~/components/tab";
import { toast } from "~/components/notification";
import { TMButton } from "~/components/tm-button";
import { productSchema, ProductSchemaType } from "~/constants/schema/product";
import { useSubmitPromise } from "~/hooks";
import { useTranslation } from "~/i18n";
import { parseCookieFromRequest } from "~/sessions";
import { DatePicker } from "~/components/form/date-picker";
import { Icon } from "~/components/icon";
import { ErrorComponent } from "~/components/error-component";

export const meta: MetaFunction = () => {
  return [{ title: "New Remix App" }, { name: "description", content: "Welcome to Remix!" }];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { vendorId, cookie } = await parseCookieFromRequest(request);
  const query = { vendorId: vendorId as string, page: "1", pageSize: "999", cookie };
  // Categories, units and tags are all selectable on the product form
  const [categories, units, tags, suggestedAttributes] = await Promise.all([
    categoryService.get(query),
    unitsService.get(query),
    tagsService.get(query),
    productService.getAttributes({ cookie, vendorId }).catch(() => ({ data: { data: [] } } as any)),
  ]);

  return {
    categories: categories.data,
    units: units.data,
    tags: tags.data,
    suggestedAttributes: (suggestedAttributes as any)?.data?.data || (suggestedAttributes as any)?.data || [],
  };
};

export default function ProductItem() {
  const { submit, isLoading } = useSubmitPromise();
  const { settings } = useOutletContext<{ settings: IVendorSettings }>();
  const moneyStep = Number(settings?.moneyStep) > 0 ? Number(settings.moneyStep) : 1000;
  const { t } = useTranslation();
  const formMethods = useForm<ProductSchemaType>({
    defaultValues: {
      name: "",
      // Left empty on purpose: the backend auto-generates code/skuCode
      // from the vendor prefix/suffix & SKU template settings.
      code: "",
      skuCode: "",
      quantity: 10,
      unit: undefined,
      categories: undefined,
      description: undefined,
      tags: undefined,
      costPrice: "20000",
      regularPrice: "50000",
      salePrice: "45000",
      wholeSalePrice: "40000",
      VAT: 5,
      expiredAt: undefined,
      isNegative: false,
      variantAttributes: [],
      variants: [],
    },
    resolver: zodResolver(productSchema),
  });
  const handleError = (errors: any) => {
    // Surface validation failures instead of failing silently
    const collect = (obj: any, prefix = ""): string[] => {
      if (!obj) return [];
      if (obj.message) return [`${prefix ? prefix + ": " : ""}${obj.message}`];
      return Object.entries(obj).flatMap(([key, value]) =>
        typeof value === "object" ? collect(value, prefix ? `${prefix}.${key}` : key) : [],
      );
    };
    const messages = collect(errors);
    if (messages.length > 0) {
      toast.danger({ title: "Dữ liệu chưa hợp lệ", message: messages.join("; ") });
    }
    console.log("errors", errors);
  };

  const onSubmit = async (v: ProductSchemaType) => {
    const payload: Record<string, unknown> = { ...v };
    // Attribute matrix -> backend payload; combinations are generated on both
    // sides so only rows with typed overrides are sent explicitly.
    // values is now Option[] {label,value}
    const draftAttrs = (v.variantAttributes || [])
      .map((a: any) => ({
        name: (a?.name || "").trim(),
        values: Array.isArray(a?.values)
          ? (a.values as any[])
              .map((o: any) => (typeof o === "string" ? o : o?.value ?? o?.label ?? ""))
              .map((s: string) => String(s).trim())
              .filter(Boolean)
          : String(a?.values || "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
      }))
      .filter((a) => a.name && a.values.length > 0);

    if (draftAttrs.length > 0) {
      payload.attributes = draftAttrs;
      // Every variant card is explicit; the backend only creates the listed
      // combinations. Cards with unselected attribute values can't resolve to
      // a combination and are skipped.
      payload.generateAll = false;
      payload.variants = (v.variants || [])
        .filter((m) => m?.options && Object.keys(m.options).length > 0)
        .map((m) => ({
          optionValues: m.options,
          skuCode: m.skuCode,
          quantity: m.quantity,
          costPrice: m.costPrice,
          regularPrice: m.regularPrice,
          salePrice: m.salePrice,
          wholeSalePrice: m.wholeSalePrice,
          isNegative: !!m.isNegative,
        }));
    }
    delete payload.variantAttributes;
    delete payload.variants;

    const response: any = await submit(
      {
        data: JSON.stringify(payload),
      },
      { method: "POST" },
    );
    // HTTPService never throws: server errors arrive as normal responses,
    // so inspect the body before claiming success.
    const bodyError =
      response?.data?.error ||
      response?.data?.message ||
      (typeof response?.data === "string" && /failed|exists|required/i.test(response.data) ? response.data : null);
    if (bodyError || (response?.status && response.status !== 200)) {
      toast.danger({
        title: t("product.createFailed"),
        message: String(bodyError || t("common.tryAgain")),
      });
      return;
    }
    toast.success({ title: t("common.success"), message: t("product.createSuccess") });
    console.log("response", response);
  };

  return (
    <FormProvider {...formMethods}>
      <form
        className="w-full flex flex-col p-2 gap-4"
        onSubmit={formMethods.handleSubmit(
          (v) => onSubmit({ ...v }),
          (error) => handleError(error),
        )}
      >
        <CardItem
          title={
            <div className="flex justify-between">
              <div>{t("sidebar.products")}</div>
              <div className="ml-auto col-span-12">
                <TMButton htmlType="submit" loading={isLoading} className="font-normal!">
                  {t("common.save")}
                </TMButton>
              </div>
            </div>
          }
          className="p-4"
        >
          <Tab
            items={[
              {
                label: t("product.infoTab"),
                content: <ProductForm moneyStep={moneyStep} />,
                value: "info",
              },
              {
                label: t("product.variantsTab"),
                content: <VariantEditor />,
                value: "variant",
              },
            ]}
            active="info"
            onChange={(value) => console.log("value", value)}
          />
        </CardItem>
      </form>
    </FormProvider>
  );
}

/**
 * Same layout as the product detail page: image column on the left,
 * form fields on the right.
 */
const ProductForm = ({ moneyStep = 1000 }: { moneyStep?: number }) => {
  const { categories, units, tags } = useLoaderData<typeof loader>();
  const { settings } = useOutletContext<{ settings: IVendorSettings }>();
  const { t } = useTranslation();
  // Variable products carry prices + negative-stock flag per variant, so the
  // parent-level fields are locked as soon as an attribute is defined.
  const form = useFormContext();
  const watchedAttrs = (form.watch("variantAttributes") || []) as any[];
  const hasVariantAttrs = watchedAttrs.some(
    (a) => (a?.name || "").trim() && (Array.isArray(a?.values) ? a.values.length > 0 : String(a?.values || "").trim()),
  );
  return (
    <div className="py-4 w-full flex gap-2">
      {/* Image column */}
      <div className="w-full max-w-xs flex flex-col gap-2">
        <ImagePreview />
        <FormControl name="image">
          {(field) => (
            <TextInput
              label={t("product.image")}
              placeholder="https://..."
              value={field.value as any}
              onChange={(e: any) => field.onChange(e.target.value)}
            />
          )}
        </FormControl>
      </div>

      {/* Fields column */}
      <div className="grid grid-cols-12 gap-4 h-fit">
        <div className="col-span-12">
          <FormControl name="name">
            <TextInput label={t("product.name")} required />
          </FormControl>
        </div>

        <div className="col-span-6">
          <FormControl name="code">
            <TextInput label={t("product.code")} />
          </FormControl>
        </div>

        <div className="col-span-6">
          <FormControl name="skuCode">
            {(field) => (
              <>
                <TextInput
                  label={t("product.sku")}
                  value={(field.value as string) || ""}
                  onChange={(e: any) => field.onChange(e.target.value)}
                  placeholder={settings?.skuTemplate ? `{CODE} → ${settings.skuTemplate}` : undefined}
                />
                <p className="text-xs text-gray-500 mt-1">{t("product.skuAutoHint")}</p>
              </>
            )}
          </FormControl>
        </div>

        <div className="col-span-4">
          <FormControl name="costPrice">
            {(field) => {
              return (
                <NumberStepper
                  required
                  label={t("product.costPrice")}
                  disabled={hasVariantAttrs}
                  value={field.value as any}
                  step={moneyStep}
                  onValueChange={(v) => field.onChange(v.value)}
                />
              );
            }}
          </FormControl>
        </div>
        <div className="col-span-4">
          <FormControl name="regularPrice">
            {(field) => {
              return (
                <NumberStepper
                  label={t("product.regularPrice")}
                  disabled={hasVariantAttrs}
                  value={field.value as any}
                  step={moneyStep}
                  onValueChange={(v) => field.onChange(v.value)}
                />
              );
            }}
          </FormControl>
        </div>
        <div className="col-span-4">
          <FormControl name="salePrice">
            {(field) => {
              return (
                <NumberStepper
                  label={t("product.salePrice")}
                  disabled={hasVariantAttrs}
                  value={field.value as any}
                  step={moneyStep}
                  onValueChange={(v) => field.onChange(v.value)}
                />
              );
            }}
          </FormControl>
        </div>
        <div className="col-span-4">
          <FormControl name="wholeSalePrice">
            {(field) => {
              return (
                <NumberStepper
                  label={t("product.wholeSalePrice")}
                  disabled={hasVariantAttrs}
                  value={field.value as any}
                  step={moneyStep}
                  onValueChange={(v) => field.onChange(v.value)}
                />
              );
            }}
          </FormControl>
        </div>
        <div className="col-span-4">
          <FormControl name="VAT">
            {(field) => {
              return (
                <NumberStepper
                  label="VAT(%)"
                  value={field.value as any}
                  onValueChange={(v) => {
                    field.onChange(v.value);
                  }}
                />
              );
            }}
          </FormControl>
        </div>

        <div className="col-span-4">
          <FormControl name="expiredAt">
            {(field) => {
              return <DatePicker label={t("product.expiredAt")} {...field} />;
            }}
          </FormControl>
        </div>
        <div className="col-span-12 flex gap-4">
          <FormControl name="quantity">
            {(field) => {
              return (
                <NumberStepper
                  label={t("product.stock")}
                  value={field.value as any}
                  step={1}
                  onValueChange={(v) => field.onChange(v.value)}
                />
              );
            }}
          </FormControl>
          <div className="flex items-end pb-2">
            <FormControl name="isNegative">
              {(field) => {
                return (
                  <CheckboxInput
                    label={t("product.allowNegative")}
                    disabled={hasVariantAttrs}
                    checked={!!field.value}
                    {...field}
                    // onChange={(e: any) => field.onChange(e.target.checked)}
                  />
                );
              }}
            </FormControl>
          </div>
        </div>

        <div className="col-span-4">
          <FormControl name="unit">
            {(field) => {
              return (
                <SelectInput
                  options={units?.data?.map((unit: any) => ({ label: unit.name, value: unit.id })) || []}
                  label={t("product.unit")}
                  {...field}
                  onSelect={(v) => field.onChange(v)}
                />
              );
            }}
          </FormControl>
        </div>
        <div className="col-span-4">
          <FormControl name="categories">
            {(field) => {
              return (
                <MultiSelectInput
                  options={categories?.data?.map((cate: any) => ({ label: cate.name, value: cate.id })) || []}
                  label={t("product.categories")}
                  {...field}
                  onSelect={(v) => field.onChange(v)}
                />
              );
            }}
          </FormControl>
        </div>
        <div className="col-span-4">
          <FormControl name="tags">
            {(field) => {
              return (
                <MultiSelectInput
                  options={tags?.data?.map((tag: any) => ({ label: tag.name, value: tag.id })) || []}
                  label={t("product.tags")}
                  {...field}
                  onSelect={(v) => field.onChange(v)}
                />
              );
            }}
          </FormControl>
        </div>
        <div className="col-span-12">
          <FormControl name="description">
            <TextInput label={t("product.note")} multiline rows={3} />
          </FormControl>
        </div>
      </div>
    </div>
  );
};

/** Large thumbnail that follows the `image` form value */
const ImagePreview = () => {
  const form = useFormContext();
  const image = form.watch("image") as string | undefined;
  if (!image) {
    return (
      <div className="w-full aspect-square rounded-lg bg-slate-50 border-3 border-dashed flex items-center justify-center text-sm text-slate-400">
        <Icon name="image" fontSize={100} />
      </div>
    );
  }
  return (
    <img
      src={image}
      alt="preview"
      className="w-full aspect-square rounded-lg object-cover border"
      onError={(e: any) => {
        e.currentTarget.style.visibility = "hidden";
      }}
    />
  );
};

export const action = async ({ request }: any) => {
  const { warehouseId, vendorId, cookie } = await parseCookieFromRequest(request);
  const formData = await request.formData();
  const data = await formData.get("data");
  const dataJson = JSON.parse(data);
  const bodyData = { ...dataJson, warehouseId, vendorId, cookie };
  const resp = await productService.createProduct(bodyData);
  return resp;
};

export function ErrorBoundary() {
  return <ErrorComponent />;
}

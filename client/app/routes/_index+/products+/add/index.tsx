import { zodResolver } from "@hookform/resolvers/zod";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import { FieldErrors, FormProvider, useForm } from "react-hook-form";
import { categoryService } from "~/action.server/category.service";
import { productAttributeService } from "~/action.server/productAttribute.service";
import { productService } from "~/action.server/products.service";
import { tagsService } from "~/action.server/tags.service";
import { unitsService } from "~/action.server/units.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { ProductForm } from "~/components/form/product-form";
import { VariantEditor } from "~/components/form/variant-editor";
import { Icon } from "~/components/icon";
import { toast } from "~/components/notification";
import { TMButton } from "~/components/tm-button";
import { productSchema, ProductSchemaType } from "~/constants/schema/product";
import { useSubmitPromise } from "~/hooks";
import { useTranslation } from "~/i18n";
import { serializeProductVariant } from "~/libs/product-payload";
import { cn } from "~/libs/utils";

export const meta: MetaFunction = () => {
  return [{ title: "New Remix App" }, { name: "description", content: "Welcome to Remix!" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const query = { page: "1", pageSize: "999" };
  // Categories, units and tags are all selectable on the product form
  const [categories, units, tags, suggestedAttributes] = await Promise.all([
    categoryService.get(query),
    unitsService.get(query),
    tagsService.get(query),
    productAttributeService.getAttributes().catch(() => ({ data: { data: [] } } as any)),
  ]);

  return {
    categories: categories.data,
    units: units.data,
    tags: tags.data,
    suggestedAttributes: (suggestedAttributes as any)?.data?.data || (suggestedAttributes as any)?.data || [],
  };
}
const sampleProduct = {
  name: "Sản phẩm 1",
  skuCode: "",
  type: 0,
  categories: [1],
  tags: [2],
  description: "Sản phẩm 1",
  variants: [
    {
      quantity: 0,
      isNegative: false,
      options: {},
      attributes: [],
      attributeValues: [],
      skuCode: null,
      barcodes: [
        {
          barcode: null,
          conversionRate: 1,
        },
      ],
    },
  ],
};
const Title = () => {
  const { t } = useTranslation();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex gap-3">
        <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
          <Icon name="package" fontSize={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">{t("sidebar.products")}</h2>
          <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
            {t("product.formHint", {
              defaultValue: "Thêm sản phẩm mới",
            })}
          </p>
        </div>
      </div>
    </div>
  );
};
export default function ProductItem() {
  const { submit, isLoading } = useSubmitPromise();
  const navigate = useNavigate();
  const { suggestedAttributes, categories, units, tags } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const formMethods = useForm<ProductSchemaType>({
    // defaultValues: sampleProduct,
    defaultValues: {
      name: "",
      skuCode: "",
      description: undefined,
      categories: undefined,
      tags: undefined,
      expiredAt: undefined,
      type: 0,
      variantAttributes: [],
      variants: [
        {
          options: {},
          barcodes: [
            {
              barcode: null,
              unitId: null,
              conversionRate: 1,
              costPrice: 0,
              retailPrice: 0,
              wholesalePrice: 0,
            },
          ],
        },
      ],
    },
    resolver: zodResolver(productSchema),
  });
  const productType = formMethods.watch("type") ?? 0;
  const setProductType = (type: number) => formMethods.setValue("type", type, { shouldDirty: true });
  const variantSeed = {
    quantity: formMethods.watch("quantity"),
    isNegative: formMethods.watch("isNegative"),
    barcodes: [{ barcode: null, unitId: null, conversionRate: 1, costPrice: 0, retailPrice: 0, wholesalePrice: 0 }],
  };

  const onSubmit = async (v: ProductSchemaType) => {
    const payload: Record<string, unknown> = { ...v };
    // New schema: variants carry attributeIds / attributeValueIds (vendor-global)
    // Build lookup from suggestedAttributes (id, name, values[id,value])
    const attrByName = new Map<string, any>();
    const valByAttrAndValue = new Map<string, number>();
    for (const a of (suggestedAttributes as any[]) || []) {
      const key = String(a.name || "")
        .trim()
        .toLowerCase();
      if (!key) continue;
      attrByName.set(key, a);
      for (const val of (a.values || []) as any[]) {
        valByAttrAndValue.set(`${key}::${String(val.value).trim().toLowerCase()}`, Number(val.id));
      }
    }
    const variantsPayload = (v.variants || [])
      .filter((m: any) => m?.barcodes?.length)
      .map((m: any) => {
        const opts: Record<string, string> = m.options || {};
        const attributeIds: number[] = [];
        const attributeValueIds: number[] = [];
        for (const [name, val] of Object.entries(opts)) {
          const k = String(name).trim().toLowerCase();
          const attr = attrByName.get(k);
          if (attr) attributeIds.push(Number(attr.id));
          const vid = valByAttrAndValue.get(`${k}::${String(val).trim().toLowerCase()}`);
          if (vid) attributeValueIds.push(vid);
        }
        return serializeProductVariant({
          skuCode: m.skuCode,
          quantity: m.quantity,
          barcodes: m.barcodes,
          isNegative: !!m.isNegative,
          VAT: m.VAT,
          imageUrl: m.imageUrl,
          isActive: m.isActive,
          options: opts,
          attributes: attributeIds,
          attributeValues: attributeValueIds,
        });
      });
    if (variantsPayload.length > 0) {
      payload.variants = variantsPayload;
      // The selected product type is authoritative. In particular, a Combo
      // must not be silently converted to Basic when it has no attributes.
      payload.type = v.type;
    } else {
      delete payload.variants;
    }
    delete payload.variantAttributes;
    // for (const key of ["code", "costPrice", "regularPrice", "salePrice", "wholeSalePrice"]) delete payload[key];
    console.log("payload", payload);
    try {
      const response: any = await submit({ data: JSON.stringify(payload) }, { method: "POST" });
      const body = response?.data ?? response;
      const bodyError = body?.error || body?.message || response?.error;
      if (bodyError || (response?.status && response.status !== 200)) {
        toast.danger({
          title: t("product.createFailed"),
          message: String(bodyError || t("common.tryAgain")),
        });
        return;
      }
      toast.success({
        title: t("common.success"),
        message: t("product.createSuccess"),
      });
      navigate("/products");
    } catch (error) {
      toast.danger({
        title: t("product.createFailed"),
        message: error instanceof Error ? error.message : t("common.tryAgain"),
      });
    }
  };
  const onError = (errors: FieldErrors<ProductSchemaType>) => {
    console.log(errors);
    toast.danger({
      title: t("product.createFailed"),
      message: Object.values(errors)[0]?.message || t("common.tryAgain"),
    });
  };
  return (
    <FormProvider {...formMethods}>
      <div className="w-full flex flex-col p-3 gap-3 overflow-auto h-full bg-slate-50/50 dark:bg-transparent">
        <div className="max-w-5xl w-full mx-auto">
          <form onSubmit={formMethods.handleSubmit(onSubmit, onError)}>
            <CardItem
              title={<Title />}
              action={
                <div className="flex items-center justify-stretch sm:justify-end gap-2 pt-2 sm:pt-0 sm:border-t-0 border-t border-slate-100 dark:border-slate-700 w-full sm:w-auto">
                  <TMButton
                    variant="ghost"
                    size="sm"
                    component={Link}
                    to="/products"
                    type="button"
                    className="flex-1 sm:flex-none"
                  >
                    {t("common.cancel")}
                  </TMButton>
                  <TMButton htmlType="submit" loading={isLoading} size="sm" className="flex-1 sm:flex-none">
                    <Icon name="save" fontSize={16} />
                    {t("common.save")}
                  </TMButton>
                </div>
              }
              className="p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                {[
                  [0, "Basic"],
                  [1, "Variant"],
                  [2, "Combo"],
                ].map(([type, label]) => (
                  <button
                    key={String(type)}
                    type="button"
                    onClick={() => setProductType(Number(type))}
                    className={cn(`rounded-md px-4 py-2 text-sm font-medium transition-all cursor-pointer`, {
                      ["bg-primary text-white shadow-sm"]: productType === type,
                      ["text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700"]:
                        productType !== type,
                    })}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <ProductForm categories={categories?.data || []} tags={tags?.data || []} />
              <VariantEditor
                type={productType as 0 | 1 | 2}
                seed={variantSeed}
                units={(units?.data || [])
                  .filter((unit: any) => unit.id != null)
                  .map((unit: any) => ({ id: unit.id, name: unit.name }))}
              />
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-700">
                <TMButton type="button" variant="ghost" size="sm" component={Link} to="..">
                  {t("common.cancel")}
                </TMButton>
                <TMButton type="submit" loading={isLoading} size="sm">
                  <Icon name="save" fontSize={16} />
                  {t("common.save")}
                </TMButton>
              </div>
            </CardItem>
          </form>
        </div>
      </div>
    </FormProvider>
  );
}

export async function action({ request }: any) {
  try {
    const formData = await request.formData();
    const data = formData.get("data");
    if (!data)
      return Response.json({ success: false, code: "VALIDATION_ERROR", message: "Missing data" }, { status: 400 });
    const dataJson = JSON.parse(data);
    const resp = await productService.createProduct(dataJson);
    if (resp.status === 200) {
      return Response.json({ success: true, data: resp.data });
    }
    throw resp;
  } catch (error) {
    return Response.json(
      {
        success: false,
        code: (error as any)?.code || "VALIDATION_ERROR",
        message: error instanceof Error ? error.message : "Create product failed",
      },
      { status: 400 },
    );
  }
}

export function ErrorBoundary() {
  return <ErrorComponent />;
}

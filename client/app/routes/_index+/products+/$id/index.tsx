import { zodResolver } from "@hookform/resolvers/zod";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { ActionFunctionArgs } from "@remix-run/node";
import { Link, useFetcher, useLoaderData } from "@remix-run/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { namedAction } from "remix-utils/named-action";
import { historyService } from "~/action.server/history.service";
import { productService } from "~/action.server/products.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { getSimpleVariant, mapSimpleVariantToProductForm, ProductForm } from "~/components/form/product-form";
import { IVariantDraft, VariantEditor } from "~/components/form/variant-editor";
import { HistoryList } from "~/components/history";
import { Icon } from "~/components/icon";
import { toast } from "~/components/notification";
import { Tab } from "~/components/tab";
import { TMButton } from "~/components/tm-button";
import { productSchema, ProductSchemaType } from "~/constants/schema/product";
import { useSubmitPromise } from "~/hooks";
import { ResponseError } from "~/http/index.server";
import { useTranslation } from "~/i18n";
import { serializeProductVariant } from "~/libs/product-payload";
import { ICategory } from "~/types/category";
import { IProduct, IProductAttribute, IProductAttributeValue, IProductVariant } from "~/types/product";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { id } = params;
  if (!id) throw new Error("Không tìm thấy sản phẩm");
  const resp = await productService.getProductById(id);
  if (resp.status !== 200) throw new Error("Không tìm thấy sản phẩm");
  const variantsResp = await productService.getProductVariants({ id });
  const productData = resp.data?.data;
  const data = {
    ...productData,
    variants: variantsResp.data?.data?.length ? variantsResp.data.data : productData?.variants,
  };

  const history = await historyService.getProductHistory(id);
  const suggestedAttributes = await productService.getAttributes().catch(() => ({ data: { data: [] } } as any));
  return {
    data,
    history: history.data,
    suggestedAttributes: (suggestedAttributes as any)?.data?.data || (suggestedAttributes as any)?.data || [],
  };
}

export const meta: MetaFunction = () => {
  return [{ title: "Product Item" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function ProductItem() {
  const { data, history } = useLoaderData<typeof loader>();
  const [edit, setEdit] = useState<boolean>(false);
  const { t } = useTranslation();
  return (
    <div className="w-full flex flex-col p-3 gap-3 overflow-auto h-full bg-slate-50/50 dark:bg-transparent">
      <div className="max-w-5xl w-full mx-auto">
        <CardItem
          title={
            <div className="flex gap-3">
              <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-700 items-center justify-center text-primary dark:text-slate-200 shrink-0">
                <Icon name="package" fontSize={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">
                  {edit ? t("common.edit") : data?.name}
                </h2>
                <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                  {edit ? t("product.formHint") : data?.code || t("product.detailHint")}
                </p>
              </div>
            </div>
          }
          className="p-5 sm:p-6"
          action={
            <TMButton variant={edit ? "ghost" : "primary"} size="sm" onClick={() => setEdit(!edit)}>
              <Icon name={edit ? "x" : "edit-2"} fontSize={14} />
              {edit ? t("common.cancel") : t("common.edit")}
            </TMButton>
          }
        >
          <EditForm />

          {/* <Tab
            active="overview"
            items={[
              {
                label: (
                  <div className="flex gap-1">
                    <Icon name="info" fontSize={16} />
                    {t("product.infoTab")}
                  </div>
                ),
                value: "overview",
                content: (
                  <div className="flex gap-2 flex-col h-full overflow-hidden pt-2">
                    <EditForm />
                  </div>
                ),
              },
              {
                label: (
                  <div className="flex gap-1">
                    <Icon name="clock" fontSize={16} />
                    {t("product.historyTab")}
                  </div>
                ),
                value: "history",
                content: (
                  <div className="">
                    <HistoryList history={history?.data || []} />
                  </div>
                ),
              },
            ]}
          /> */}
        </CardItem>
      </div>
    </div>
  );
}

const VariantsManager = ({
  productId,
  attributes: serverAttributes,
  variants: serverVariants,
  productType,
  units,
}: {
  productId?: number | string;
  attributes: IProductAttribute[];
  variants: IProductVariant[];
  productType: number;
  units?: { id: number | string; name: string }[];
}) => {
  const { submit, isLoading } = useSubmitPromise();
  const { t } = useTranslation();
  const loaderData = useLoaderData<typeof loader>();

  const suggestedAttributes: any[] = loaderData?.suggestedAttributes || [];

  const invSum = (variant: IProductVariant) => {
    return (variant.inventories || []).reduce((sum, inv) => sum + Number(inv.quantity || 0), 0);
  };
  const defaultVariant = productType === 0 ? getSimpleVariant({ variants: serverVariants }) : undefined;
  console.log(`productType`, productType);
  const defaultVariantValues = defaultVariant
    ? {
        quantity: invSum(defaultVariant),
        barcodes: defaultVariant.barcodes || [],
        VAT: defaultVariant.VAT ?? null,
        isNegative: !!defaultVariant.isNegative,
      }
    : {};

  // Defaults are derived from the server data on every render; the form is
  // reset only when the server-side structure (attribute/variant ids) changes,
  // so in-progress edits survive unrelated revalidations.
  const defaults = useMemo(() => {
    let attrs = (serverAttributes || []).map((a) => ({
      id: a.id,
      name: a.name,
      values: ((a.values || []) as IProductAttributeValue[]).map((v) => ({
        label: v.value,
        value: v.value,
      })),
    }));
    const editableVariants = productType === 0 ? (defaultVariant ? [defaultVariant] : []) : serverVariants;
    const variants = editableVariants.map((v) => ({
      variantId: v.id,
      ...v,
      quantity: invSum(v),
      options: Object.fromEntries(
        ((v.attributeValues || []) as any[]).map((av: any) => [
          av.attribute?.name || av.productAttribute?.name || "",
          av.value,
        ]),
      ),
    }));
    if (!attrs.length && variants.length && suggestedAttributes.length) {
      const names = [...new Set(variants.flatMap((v) => Object.keys(v.options || {})))].filter(Boolean);
      attrs = names
        .map((name) => {
          const cat = (suggestedAttributes as any[]).find(
            (a: any) => String(a.name).trim().toLowerCase() === String(name).trim().toLowerCase(),
          );
          if (!cat) return { id: name, name, values: [] as any[] };
          return {
            id: cat.id,
            name: cat.name,
            values: ((cat.values || []) as any[]).map((val: any) => ({
              label: val.value,
              value: val.value,
            })),
          };
        })
        .filter((a: any) => a.name);
    }
    return {
      variantAttributes: attrs as any,
      variants,
      attributeIds: attrs.map((a) => (a as any).id),
      variantIds: serverVariants.map((v) => v.id),
      type: productType,
    };
  }, [productType, serverAttributes, serverVariants, suggestedAttributes]);

  const signature = `${defaults.attributeIds.join("-")}|${defaults.variantIds.join("-")}`;
  const lastSignature = useRef(signature);
  const formMethods = useForm({ defaultValues: defaults });

  useEffect(() => {
    if (lastSignature.current !== signature) {
      lastSignature.current = signature;
      formMethods.reset(defaults);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const onSubmit = async (v: any) => {
    const catalog: any[] = suggestedAttributes.length ? suggestedAttributes : (serverAttributes as any[]);
    const attrByName = new Map<string, any>();
    const valByAttrAndValue = new Map<string, number>();
    for (const a of catalog as any[]) {
      const k = String(a.name || "")
        .trim()
        .toLowerCase();
      if (!k) continue;
      attrByName.set(k, a);
      for (const val of (a.values || []) as any[]) {
        valByAttrAndValue.set(`${k}::${String(val.value).trim().toLowerCase()}`, Number(val.id));
      }
    }
    const list = v.variants || [];
    const variantsPayload = list
      .filter((m: any) => m?.barcodes?.length)
      .map(({ variantId, options, ...fields }: any) => {
        const attributeIds: number[] = [];
        const attributeValueIds: number[] = [];
        for (const [name, val] of Object.entries(options as Record<string, string>)) {
          const k = String(name).trim().toLowerCase();
          const attr = attrByName.get(k);
          if (attr) attributeIds.push(Number(attr.id));
          const vid = valByAttrAndValue.get(`${k}::${String(val).trim().toLowerCase()}`);
          if (vid) attributeValueIds.push(vid);
        }
        return serializeProductVariant({
          variantId,
          id: variantId,
          ...fields,
          options,
          attributes: attributeIds,
          attributeValues: attributeValueIds,
        });
      });
    const removedVariantIds = defaults.variantIds.filter(
      (id) =>
        !list.some((m: any) => String(m.variantId) === String(id) && m?.options && Object.keys(m.options).length > 0),
    );
    if (productType === 0) {
      if (variantsPayload.length === 0) {
        toast.danger({
          title: t("common.error"),
          message: "Vui lòng chọn ít nhất một tổ hợp biến thể trước khi chuyển đổi sản phẩm.",
        });
        return;
      }
      if (
        !window.confirm(
          "Hành động này sẽ thay đổi cấu trúc mã vạch/SKU và có thể làm gián đoạn việc quét mã tại POS. Bạn có chắc chắn không?",
        )
      ) {
        return;
      }
    }
    try {
      const response: any = await submit(
        {
          intent: "updateProduct",
          data: JSON.stringify({
            data: {
              // Preserve combo products (server ignores variants for type 2).
              type: (loaderData as any)?.data?.type === 2 ? 2 : productType,
              variants: variantsPayload,
              removedVariantIds,
              ...(productType === 0
                ? {
                    quantity: variantsPayload[0]?.quantity,
                    skuCode: variantsPayload[0]?.skuCode,
                    VAT: variantsPayload[0]?.VAT,
                    isNegative: variantsPayload[0]?.isNegative,
                    isActive: variantsPayload[0]?.isActive,
                  }
                : {}),
            },
          }),
        },
        { method: "POST" },
      );
      const body = response?.data ?? response;
      const error = body?.error || body?.message || response?.error;
      if (error || (body?.status && body.status !== 200)) {
        toast.danger({
          title: t("common.error"),
          message: String(error || t("common.tryAgain")),
        });
        return;
      }
      toast.success({
        title: t("common.success"),
        message: t("product.updateSuccess", {
          defaultValue: "Update product success",
        }),
      });
    } catch (error) {
      toast.danger({
        title: t("common.error"),
        message: error instanceof Error ? error.message : t("common.tryAgain"),
      });
    }
  };

  if (!productId) return null;

  return (
    <FormProvider {...formMethods}>
      <div className="flex flex-col gap-5 mt-2">
        <div className="p-1">
          <VariantEditor
            seed={productType === 0 ? (defaultVariantValues as Partial<IVariantDraft>) : undefined}
            protectFirstVariant={productType === 0}
            units={units || []}
            type={productType as 0 | 1 | 2}
          />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-2 dark:border-slate-700">
          <TMButton type="button" variant="ghost" size="sm" component={Link} to="..">
            {t("common.cancel")}
          </TMButton>
          <TMButton type="button" onClick={formMethods.handleSubmit(onSubmit)} loading={isLoading} size="sm">
            <Icon name="save" fontSize={16} />
            {t("common.save")}
          </TMButton>
        </div>
      </div>
    </FormProvider>
  );
};

const VariantTransitionNotice = ({ reason }: { reason?: string | null }) => (
  <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
    <Icon name="alert-triangle" fontSize={18} className="mt-0.5 shrink-0" />
    <div className="flex flex-col gap-1 text-sm">
      <strong>Chưa thể chuyển sản phẩm sang biến thể</strong>
      <span>{reason || "Đơn hàng của sản phẩm chưa có invoice đã hoàn tất."}</span>
    </div>
  </div>
);

const EditForm = () => {
  const { data } = useLoaderData<typeof loader>();
  console.log(`data`, data);
  const { t } = useTranslation();
  const productType = Number((data as any)?.type ?? 0);
  const hasVariants = productType === 1;
  const variantTransitionBlocked = Boolean((data as any)?.variantTransitionBlocked);
  const product = data as IProduct;
  const simpleVariant = productType === 0 ? getSimpleVariant(product) : undefined;
  const simpleVariantFields: Partial<ProductSchemaType> =
    productType === 0 ? mapSimpleVariantToProductForm(product, simpleVariant) : {};
  const { submit, isLoading } = useSubmitPromise();
  const formMethods = useForm<ProductSchemaType>({
    defaultValues: {
      name: data?.name ?? "",
      skuCode: simpleVariantFields.skuCode ?? data?.skuCode ?? "",
      type: productType,
      quantity: (simpleVariantFields.quantity as number) ?? undefined,
      unit: data?.unitId || undefined,
      categories: ((data?.categories as ICategory[]) || []).map((item: ICategory) => item?.id).filter(Boolean) as any,
      tags: ((data?.tags as ICategory[]) || []).map((item: ICategory) => item?.id).filter(Boolean) as any,
      description: data?.description ?? "",
      VAT: simpleVariantFields.VAT ?? (data as any)?.VAT ?? 0,
      image: simpleVariantFields.image,
      isNegative: simpleVariantFields.isNegative,
      expiredAt: (data as any)?.expiredAt || undefined,
    },
    resolver: zodResolver(productSchema),
  });

  const handleError = (errors: any) => {
    console.log("errors", errors);
    toast.danger({
      title: t("common.error"),
      message: (Object.values(errors)[0] as any)?.message || t("common.tryAgain"),
    });
  };

  const { load, data: categories } = useFetcher<{ data: ICategory[] }>({
    key: "categories",
  });
  const { load: loadUnits, data: units } = useFetcher<{ data: ICategory[] }>({
    key: "units",
  });
  const { load: loadTags, data: tags } = useFetcher<{ data: ICategory[] }>({
    key: "tags",
  });
  useEffect(() => {
    load("/categories");
    loadUnits("/units");
    loadTags("/tags");
  }, []);
  const onSubmit = async (v: ProductSchemaType) => {
    try {
      const { unit, quantity, ...rest } = v as any;
      const response = await submit<{ status: number }>(
        {
          data: JSON.stringify({
            // Unified PUT /products/:id: simple products update base + stock,
            // variant products update base only (prices/stock live on variants).
            data: {
              ...rest,
              unitId: unit,
              ...(hasVariants ? {} : { quantity }),
              type: productType,
            },
          }),
          intent: "updateProduct",
        },
        { method: "POST" },
      );
      const responseBody = (response as any)?.data ?? response;
      if (!responseBody?.error && responseBody?.status === 200) {
        return toast.success({
          title: "Success",
          message: "Update product success",
        });
      }
      throw new Error(responseBody?.error || responseBody?.message || t("common.tryAgain"));
    } catch (error) {
      toast.danger({
        title: t("common.error"),
        message: error instanceof Error ? error.message : t("common.tryAgain"),
      });
    }
  };
  return (
    <FormProvider {...formMethods}>
      <form
        className="flex flex-col gap-5 mt-2"
        onSubmit={formMethods.handleSubmit(onSubmit, (error) => handleError(error))}
      >
        <ProductForm categories={categories?.data || []} tags={tags?.data || []} />
        {(hasVariants || productType === 0) &&
          (variantTransitionBlocked ? (
            <VariantTransitionNotice reason={(data as any)?.variantTransitionBlockReason} />
          ) : (
            <div className="border-t border-slate-200 pt-5 dark:border-slate-700">
              <VariantsManager
                productId={data?.id}
                attributes={(data?.attributes || []) as IProductAttribute[]}
                variants={(data?.variants || []) as IProductVariant[]}
                productType={productType}
                units={(units?.data || [])
                  .filter((unit: any) => unit.id != null)
                  .map((unit: any) => ({ id: unit.id, name: unit.name }))}
              />
            </div>
          ))}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-2 dark:border-slate-700">
          <TMButton variant="ghost" size="sm" component={Link} to=".." type="button">
            {t("common.cancel")}
          </TMButton>
          <TMButton htmlType="submit" loading={isLoading} size="sm">
            <Icon name="save" fontSize={16} />
            {t("common.save")}
          </TMButton>
        </div>
      </form>
    </FormProvider>
  );
};

export async function action({ request, params }: ActionFunctionArgs) {
  try {
    const { id } = params;
    if (!id) return Response.json({ error: "Không tìm thấy sản phẩm" }, { status: 400 });
    const formData = await request.formData();
    return namedAction(formData, {
      updateProduct: async () => {
        const raw = formData.get("data");
        if (!raw) return Response.json({ error: "Missing data" }, { status: 400 });
        let data: any;
        try {
          data = JSON.parse(String(raw));
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const payload = data?.data ?? data;
        if (typeof payload !== "object" || payload === null) {
          return Response.json({ error: "Invalid product payload" }, { status: 400 });
        }
        const response = await productService.updateProduct({ id, ...payload });
        return Response.json(response);
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String((error as any)?.error || "Update product failed");
    const status = error instanceof ResponseError ? error.status : Number((error as any)?.status) || 400;
    return Response.json({ error: message, status }, { status });
  }
}

export function ErrorBoundary() {
  return <ErrorComponent />;
}

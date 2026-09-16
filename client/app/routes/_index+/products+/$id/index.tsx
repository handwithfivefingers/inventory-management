import { zodResolver } from "@hookform/resolvers/zod";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { ActionFunctionArgs } from "@remix-run/node";
import { Link, useFetcher, useLoaderData, useOutletContext } from "@remix-run/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { namedAction } from "remix-utils/named-action";
import { withContext } from "~/action.server/context.server";
import { historyService } from "~/action.server/history.service";
import { productService } from "~/action.server/products.service";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { ProductForm } from "~/components/form/product-form";
import { VariantEditor } from "~/components/form/variant-editor";
import { Icon } from "~/components/icon";
import { Tab } from "~/components/tab";
import { TMButton } from "~/components/tm-button";
import { TMTimeline } from "~/components/tm-timeline";
import { productSchema, ProductSchemaType } from "~/constants/schema/product";
import { useSubmitPromise } from "~/hooks";
import { useTranslation } from "~/i18n";
import { parseCookieFromRequest } from "~/sessions";
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
          <Tab
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
                    <Icon name="sliders" fontSize={16} />
                    {t("product.variantsTab")}
                  </div>
                ),
                value: "variants",
                content: (
                  <VariantsManager
                    productId={data?.id}
                    attributes={(data?.attributes || []) as IProductAttribute[]}
                    variants={(data?.variants || []) as IProductVariant[]}
                  />
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
          />
        </CardItem>
      </div>
    </div>
  );
}

const VariantsManager = ({
  productId,
  attributes: serverAttributes,
  variants: serverVariants,
}: {
  productId?: number | string;
  attributes: IProductAttribute[];
  variants: IProductVariant[];
}) => {
  const { submit, isLoading } = useSubmitPromise();
  const { t } = useTranslation();
  const loaderData: any = (() => {
    try {
      return useLoaderData() as any;
    } catch {
      return {};
    }
  })();
  const suggestedAttributes: any[] = loaderData?.suggestedAttributes || [];
  let moneyStep = 1000;
  try {
    const ctx = useOutletContext<{ settings?: { moneyStep?: number | string } }>();
    const step = Number(ctx?.settings?.moneyStep);
    if (step > 0) moneyStep = step;
  } catch {
    // no layout context -> default step
  }

  const invSum = (variant: IProductVariant) =>
    (variant.inventories || []).reduce((sum, inv) => sum + Number(inv.quantity || 0), 0);

  // Defaults are derived from the server data on every render; the form is
  // reset only when the server-side structure (attribute/variant ids) changes,
  // so in-progress edits survive unrelated revalidations.
  const defaults = useMemo(() => {
    let attrs = (serverAttributes || []).map((a) => ({
      id: a.id,
      name: a.name,
      values: ((a.values || []) as IProductAttributeValue[]).map((v) => ({ label: v.value, value: v.value })),
    }));
    const variants = serverVariants.map((v) => ({
      variantId: v.id,
      options: Object.fromEntries(
        ((v.attributeValues || []) as any[]).map((av: any) => [
          av.attribute?.name || av.productAttribute?.name || "",
          av.value,
        ]),
      ),
      code: (v as any).code ?? "",
      skuCode: v.skuCode,
      quantity: invSum(v),
      costPrice: (v.costPrice ?? "") as any,
      regularPrice: (v.regularPrice ?? "") as any,
      salePrice: (v.salePrice ?? "") as any,
      wholeSalePrice: (v.wholeSalePrice ?? "") as any,
      isNegative: !!(v as any).isNegative,
    }));
    // Fallback: if product no longer stores attributes per product, derive from variants + catalog
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
            values: ((cat.values || []) as any[]).map((val: any) => ({ label: val.value, value: val.value })),
          };
        })
        .filter((a: any) => a.name);
    }
    return {
      variantAttributes: attrs as any,
      variants,
      attributeIds: attrs.map((a) => (a as any).id),
      variantIds: serverVariants.map((v) => v.id),
    };
  }, [serverAttributes, serverVariants, suggestedAttributes]);

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

  const onSubmit = (v: any) => {
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
      .filter((m: any) => m?.options && Object.keys(m.options).length > 0)
      .map(({ variantId, options, code, ...fields }: any) => {
        const attributeIds: number[] = [];
        const attributeValueIds: number[] = [];
        for (const [name, val] of Object.entries(options as Record<string, string>)) {
          const k = String(name).trim().toLowerCase();
          const attr = attrByName.get(k);
          if (attr) attributeIds.push(Number(attr.id));
          const vid = valByAttrAndValue.get(`${k}::${String(val).trim().toLowerCase()}`);
          if (vid) attributeValueIds.push(vid);
        }
        return {
          variantId,
          id: variantId,
          ...fields,
          // Per-variant barcode: manual value wins, blank clears to null on the
          // server, missing auto-extends the parent barcode.
          ...(code !== undefined ? { code: String(code ?? "").trim() } : {}),
          attributes: attributeIds,
          attributeValues: attributeValueIds,
        };
      });
    const removedVariantIds = defaults.variantIds.filter(
      (id) => !list.some((m: any) => String(m.variantId) === String(id)),
    );
    submit(
      {
        intent: "updateProduct",
        data: JSON.stringify({
          data: {
            // Preserve combo products (server ignores variants for type 2).
            type: (loaderData as any)?.data?.type === 2 ? 2 : 1,
            variants: variantsPayload,
            removedVariantIds,
          },
        }),
      },
      { method: "POST" },
    );
  };

  if (!productId) return null;

  return (
    <FormProvider {...formMethods}>
      <form onSubmit={formMethods.handleSubmit(onSubmit)} className="flex flex-col gap-5 mt-2">
        <div className="p-1">
          <VariantEditor />
        </div>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 mt-1">
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

const EditForm = () => {
  const { data } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const hasVariants = (data?.variants || []).length > 0;
  const productType = (data as any)?.type ?? (hasVariants ? 1 : 0);
  let moneyStep = 1000;
  try {
    const ctx = useOutletContext<{ settings?: { moneyStep?: number | string } }>();
    const step = Number(ctx?.settings?.moneyStep);
    if (step > 0) moneyStep = step;
  } catch {
    // no layout context -> default step
  }
  const { submit, isLoading } = useSubmitPromise();
  const formMethods = useForm<ProductSchemaType>({
    defaultValues: {
      name: data?.name ?? "",
      code: data?.code ?? "",
      skuCode: data?.skuCode ?? "",
      type: productType as any,
      quantity: (data?.quantity as number) ?? undefined,
      unit: (data as any)?.unitId || undefined,
      categories: ((data?.categories as ICategory[]) || []).map((item: ICategory) => item?.id).filter(Boolean) as any,
      tags: (((data as any)?.tags as ICategory[]) || []).map((item: ICategory) => item?.id).filter(Boolean) as any,
      description: data?.description ?? "",
      costPrice: (data?.costPrice ?? undefined) as any,
      regularPrice: (data?.regularPrice ?? undefined) as any,
      salePrice: (data?.salePrice ?? undefined) as any,
      wholeSalePrice: (data?.wholeSalePrice ?? undefined) as any,
      VAT: (data as any)?.VAT ?? 5,
      expiredAt: (data as any)?.expiredAt || undefined,
    },
    resolver: zodResolver(productSchema),
  });

  const handleError = (errors: any) => {
    console.log("errors", errors);
  };

  const { load, data: categories } = useFetcher<{ data: ICategory[] }>({ key: "categories" });
  const { load: loadUnits, data: units } = useFetcher<{ data: ICategory[] }>({ key: "units" });
  const { load: loadTags, data: tags } = useFetcher<{ data: ICategory[] }>({ key: "tags" });
  useEffect(() => {
    load("/categories");
    loadUnits("/units");
    loadTags("/tags");
    (window as any).form = formMethods;
  }, []);

  const onSubmit = (v: ProductSchemaType) => {
    const { unit, quantity, ...rest } = v as any;
    submit(
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
  };
  return (
    <FormProvider {...formMethods}>
      <form
        className="flex flex-col gap-5 mt-2"
        onSubmit={formMethods.handleSubmit(onSubmit, (error) => handleError(error))}
      >
        <ProductForm
          barcode={data?.code}
          categories={categories?.data || []}
          tags={tags?.data || []}
          units={units?.data || []}
          moneyStep={moneyStep}
        />
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 mt-1">
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

const HistoryList = ({ history }: { history: IProduct[] }) => {
  console.log("history", history);
  return (
    <div className="w-full flex flex-col gap-2">
      <TMTimeline
        items={
          history.map((item: any) => ({
            title: item.type == 0 ? `Nhập Kho  - SL:${item.quantity}` : `Xuất kho  - SL:${item.quantity}`,
            description: (
              <span>
                SKU:{" "}
                <span className="bg-slate-100 dark:bg-slate-700 border border-slate-200/50 dark:border-slate-600 px-2 py-0.5 rounded">
                  {item.variant?.skuCode || item?.skuCode}
                </span>
              </span>
            ),
            date: item?.updatedAt,
            variant: item.type == 0 ? "success" : "danger",
          })) || []
        }
      />
    </div>
  );
};

export async function action({ request, params }: ActionFunctionArgs) {
  // const { warehouseId, vendorId, cookie } = await parseCookieFromRequest(request);
  const { id } = params;
  if (!id) throw new Error("Không tìm thấy sản phẩm");
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
      const response = await productService.updateProduct({
        id,
        ...payload,
      });
      return Response.json(response);
    },
  });
}

export function ErrorBoundary() {
  return <ErrorComponent />;
}

import { zodResolver } from "@hookform/resolvers/zod";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { ActionFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData, useOutletContext } from "@remix-run/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { NumericFormat } from "react-number-format";
import { historyService } from "~/action.server/history.service";
import { productService } from "~/action.server/products.service";
import { BarCode } from "~/components/barcode";
import { CardItem } from "~/components/card-item";
import { ErrorComponent } from "~/components/error-component";
import { DatePicker } from "~/components/form/date-picker";
import { FormControl } from "~/components/form/form-control";
import { MultiSelectInput } from "~/components/form/multi-select-input";
import { NumberInput } from "~/components/form/number-input";
import { SelectInput } from "~/components/form/select-input";
import { TextInput } from "~/components/form/text-input";
import { VariantEditor } from "~/components/form/variant-editor";
import { Icon } from "~/components/icon";
import { Tab } from "~/components/tab";
import { TMButton } from "~/components/tm-button";
import { productSchema } from "~/constants/schema/product";
import { useSubmitPromise } from "~/hooks";
import { useTranslation } from "~/i18n";
import { dayjs } from "~/libs/date";
import { cn } from "~/libs/utils";
import { parseCookieFromRequest } from "~/sessions";
import { ICategory } from "~/types/category";
import { IProduct, IProductAttribute, IProductAttributeValue, IProductVariant } from "~/types/product";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { warehouseId, cookie } = await parseCookieFromRequest(request);
  const { id } = params;
  if (!id || !warehouseId) throw new Error("Không tìm thấy sản phẩm");
  const resp = await productService.getProductById({ id, cookie, warehouseId });
  // The detail query doesn't join variant inventories; the variants endpoint
  // does (scoped to the active warehouse), so prefer it for stock display.
  const variantsResp = await productService.getProductVariants({ id, cookie, warehouseId });
  const productData = resp.data?.data;
  const data = {
    ...productData,
    variants: variantsResp.data?.data?.length ? variantsResp.data.data : productData?.variants,
  };
  const history = await historyService.getProductHistory({ id: id as string, warehouseId: [warehouseId], cookie });
  return { data, history: history.data };
};

export const meta: MetaFunction = () => {
  return [{ title: "Product Item" }, { name: "description", content: "Welcome to Remix!" }];
};

export default function ProductItem() {
  const { data, history } = useLoaderData<typeof loader>();
  const [edit, setEdit] = useState<boolean>(false);
  const { t } = useTranslation();
  console.log(data, history);
  return (
    <div className=" w-full flex flex-col p-2 gap-2 h-full">
      <CardItem
        title={
          <div className="flex justify-between items-center">
            <h5>{edit ? t("common.edit") : data?.name}</h5>
            <TMButton variant="ghost" size="xs" onClick={() => setEdit(!edit)}>
              {edit ? t("common.cancel") : t("common.edit")}
            </TMButton>
          </div>
        }
        className="p-4 h-full"
      >
        <Tab
          active="overview"
          items={[
            {
              label: t("product.overviewTab"),
              value: "overview",
              content: (
                <div className="flex gap-2 flex-col h-full overflow-hidden pt-2">
                  {!edit ? <Detail /> : null}
                  {edit ? <EditForm /> : null}
                </div>
              ),
            },
            {
              label: t("product.variantsTab"),
              value: "variants",
              content: (
                <div className="pt-2">
                  <VariantsManager
                    productId={data?.id}
                    attributes={(data?.attributes || []) as IProductAttribute[]}
                    variants={(data?.variants || []) as IProductVariant[]}
                  />
                </div>
              ),
            },
            {
              label: t("product.historyTab"),
              value: "history",
              content: (
                <div className="pt-2 -mx-4 -mb-4">
                  <HistoryList history={history?.data || []} />
                </div>
              ),
            },
          ]}
        />
      </CardItem>
    </div>
  );
}

/**
 * Combined attributes + variants editor for the product detail page,
 * mirroring the /products/add experience: attribute matrix, generate-all vs
 * manual picking, per-variant fields and removal. Everything is staged in a
 * local form and flushed to the server with one "Save" (syncVariants).
 */

const VariantsManager = ({
  productId,
  attributes: serverAttributes,
  variants: serverVariants,
}: {
  productId?: number | string;
  attributes: IProductAttribute[];
  variants: IProductVariant[];
}) => {
  const fetcher = useFetcher<unknown>();
  const busy = fetcher.state !== "idle";
  const { t } = useTranslation();
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
    const attrs = (serverAttributes || []).map((a) => ({
      id: a.id,
      name: a.name,
      values: ((a.values || []) as IProductAttributeValue[]).map((v) => v.value).join(", "),
    }));
    const variants = serverVariants.map((v) => ({
      variantId: v.id,
      options: Object.fromEntries(
        // Nested attribute may arrive as `productAttribute` (default Sequelize
        // alias) or `attribute` depending on the endpoint
        ((v.attributeValues || []) as any[]).map((av: any) => [
          av.attribute?.name || av.productAttribute?.name || "",
          av.value,
        ]),
      ),
      skuCode: v.skuCode,
      quantity: invSum(v),
      costPrice: (v.costPrice ?? "") as any,
      regularPrice: (v.regularPrice ?? "") as any,
      salePrice: (v.salePrice ?? "") as any,
      wholeSalePrice: (v.wholeSalePrice ?? "") as any,
      isNegative: !!(v as any).isNegative,
    }));
    return {
      // Key must be `variantAttributes`: that's the field name VariantEditor
      // reads/writes through the form context (matches /products/add).
      variantAttributes: attrs,
      variants,
      attributeIds: attrs.map((a) => a.id),
      variantIds: serverVariants.map((v) => v.id),
    };
  }, [serverAttributes, serverVariants]);

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
    const draftAttrs = (v.variantAttributes || [])
      .map((a: any) => ({
        ...(a?.id ? { id: a.id } : {}),
        name: (a?.name || "").trim(),
        values: (a?.values || "")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
      }))
      .filter((a: any) => a.name && a.values.length > 0);
    const deletedAttributeIds = defaults.attributeIds.filter(
      (id) => id && !draftAttrs.some((d: any) => String(d.id) === String(id)),
    );

    // Every remaining card is explicit; incomplete cards (attribute value not
    // picked yet) can't resolve server-side and are skipped.
    const list = v.variants || [];
    const variantsPayload = list
      .filter((m: any) => m?.options && Object.keys(m.options).length > 0)
      .map(({ variantId, options, ...fields }: any) => ({ optionValues: options, ...fields }));
    const removedVariantIds = defaults.variantIds.filter(
      (id) => !list.some((m: any) => String(m.variantId) === String(id)),
    );

    fetcher.submit(
      {
        _action: "syncVariants",
        payload: JSON.stringify({
          generateAll: false,
          attributes: draftAttrs,
          deletedAttributeIds,
          variants: variantsPayload,
          removedVariantIds,
        }),
      },
      { method: "POST" },
    );
  };

  if (!productId) return null;

  return (
    <FormProvider {...formMethods}>
      <form onSubmit={formMethods.handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <div className="p-4">
          <VariantEditor />
        </div>
        <div className="ml-auto">
          <TMButton htmlType="submit" loading={busy} size="sm">
            {t("common.save")}
          </TMButton>
        </div>
      </form>
    </FormProvider>
  );
};

const Detail = () => {
  const { data } = useLoaderData<typeof loader>();
  return (
    <div className="w-full grid grid-cols-5 gap-4">
      <div className="col-span-2 flex gap-2 flex-col ">
        {data?.image ? (
          <img src={data.image} alt={data?.name} className="w-full h-full p-8 rounded-lg aspect-square object-cover" />
        ) : (
          <div className="bg-slate-50 w-full h-full p-8 rounded-lg aspect-square" />
        )}
        <div className="w-full py-2 rounded-md flex justify-center">
          <BarCode code={data?.code || ""} />
        </div>
      </div>
      <div className="col-span-3 px-12">
        <ul className="flex flex-col gap-2">
          <li className="flex justify-between">
            <span>Ngày tạo: </span>
            <span>{dayjs(data?.createdAt).format("DD/MM/YYYY")}</span>
          </li>
          <li className="flex justify-between">
            <span>Mã hàng hóa: </span>
            <span>{data?.code} </span>
          </li>
          <li className="flex justify-between">
            <span>Mã sku: </span>
            <span>{data?.skuCode} </span>
          </li>
          <li className="flex justify-between">
            <span>Đã bán: </span>
            <span>{data?.sold} </span>
          </li>
          <li className="flex justify-between">
            <span>Tồn kho: </span>
            <span>{data?.quantity} </span>
          </li>
          <li className="flex justify-between">
            <span>Đơn vị tính: </span>
            <span>{data?.unitName} </span>
          </li>
          <li className="flex justify-between">
            <span>Danh mục: </span>
            <span>
              {data?.categories?.length
                ? (data?.categories as ICategory[])?.map((item: ICategory) => item.name).join(", ")
                : ""}
            </span>
          </li>
          <li className="flex justify-between">
            <span>Giá bán lẻ: </span>
            <span>
              <NumericFormat value={data?.regularPrice} displayType="text" thousandSeparator="," />
            </span>
          </li>
          <li className="flex justify-between">
            <span>Giá khuyến mại: </span>
            <span>
              <NumericFormat value={data?.salePrice} displayType="text" thousandSeparator="," />
            </span>
          </li>
          <li className="flex justify-between">
            <span>Giá bán sỉ: </span>
            <span>
              <NumericFormat value={data?.wholeSalePrice} displayType="text" thousandSeparator="," />
            </span>
          </li>
          <li className="flex justify-between">
            <span>Giá vốn: </span>
            <span>
              <NumericFormat value={data?.costPrice} displayType="text" thousandSeparator="," />
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
};
const EditForm = () => {
  const { data } = useLoaderData<typeof loader>();
  // Variable products carry their own prices per variant; editing them at
  // product level would be misleading, so those fields are locked.
  const hasVariants = (data?.variants || []).length > 0;
  const { submit, isLoading } = useSubmitPromise();
  // Seed from loader data so the form opens pre-filled; EditForm only mounts
  // when `edit` is toggled, so `data` is always available by then.
  const formMethods = useForm({
    defaultValues: {
      name: data?.name ?? "",
      code: data?.code ?? "",
      skuCode: data?.skuCode ?? "",
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

  const onSubmit = (v: any) => {
    console.log("v", v);
    submit(
      {
        data: JSON.stringify({
          data: { ...v, id: data?.id },
        }),
      },
      { method: "POST", action: "/products/edit" },
    );
  };
  return (
    <FormProvider {...formMethods}>
      <form
        className="py-2 grid grid-cols-12 gap-4"
        onSubmit={formMethods.handleSubmit(onSubmit, (error) => handleError(error))}
      >
        <div className="col-span-12">
          <FormControl name="name">
            <TextInput label="Tên hàng hóa" />
          </FormControl>
        </div>
        <div className="col-span-6">
          <FormControl name="code">
            <TextInput label="Mã code" />
          </FormControl>
        </div>
        <div className="col-span-6">
          <FormControl name="skuCode">
            <TextInput label="Mã sku" />
          </FormControl>
        </div>
        <div className="col-span-4">
          <FormControl name="costPrice">
            {(field) => {
              return (
                <NumberInput
                  label="Giá vốn"
                  disabled={hasVariants}
                  value={field.value as any}
                  onValueChange={(v, info) => {
                    field.onChange(v.value);
                  }}
                />
              );
            }}
          </FormControl>
        </div>
        <div className="col-span-4">
          <FormControl name="regularPrice">
            {(field) => {
              return (
                <NumberInput
                  label="Giá bán lẻ"
                  disabled={hasVariants}
                  value={field.value as any}
                  onValueChange={(v, info) => {
                    field.onChange(v.value);
                  }}
                />
              );
            }}
          </FormControl>
        </div>
        <div className="col-span-4">
          <FormControl name="salePrice">
            {(field) => {
              return (
                <NumberInput
                  label="Giá khuyến mại"
                  disabled={hasVariants}
                  value={field.value as any}
                  onValueChange={(v, info) => {
                    field.onChange(v.value);
                  }}
                />
              );
            }}
          </FormControl>
        </div>
        <div className="col-span-4">
          <FormControl name="wholeSalePrice">
            {(field) => {
              return (
                <NumberInput
                  label="Giá bán sỉ"
                  disabled={hasVariants}
                  value={field.value as any}
                  onValueChange={(v, info) => {
                    field.onChange(v.value);
                  }}
                />
              );
            }}
          </FormControl>
        </div>
        <div className="col-span-6">
          <FormControl name="expiredAt">
            {(field) => {
              return <DatePicker {...field} label="Ngày hết hạn" />;
            }}
          </FormControl>
        </div>
        <div className="col-span-2">
          <FormControl name="VAT">
            {(field) => {
              return (
                <NumberInput
                  label="VAT(%)"
                  value={field.value as any}
                  onValueChange={(v, info) => {
                    field.onChange(v.value);
                  }}
                />
              );
            }}
          </FormControl>
        </div>
        <div className="col-span-6">
          <FormControl name="quantity">
            {(field) => {
              return (
                <NumberInput
                  label="Tồn kho"
                  value={field.value as any}
                  onValueChange={(v, info) => {
                    field.onChange(v.value);
                  }}
                />
              );
            }}
          </FormControl>
        </div>
        <div className="col-span-6">
          <FormControl name="unit">
            {(field) => {
              return (
                <SelectInput
                  options={units?.data?.map((cate) => ({ label: cate.name, value: cate?.id || undefined })) || []}
                  label="Đơn vị tính"
                  {...field}
                  onSelect={(v) => field.onChange(v)}
                />
              );
            }}
          </FormControl>
        </div>
        <div className="col-span-6">
          <FormControl name="categories">
            {(field) => {
              return (
                <MultiSelectInput
                  options={categories?.data?.map((cate) => ({ label: cate.name, value: cate?.id || undefined })) || []}
                  label="Danh Mục"
                  {...field}
                  onSelect={(v) => field.onChange(v)}
                />
              );
            }}
          </FormControl>
        </div>
        <div className="col-span-6">
          <FormControl name="tags">
            {(field) => {
              return (
                <MultiSelectInput
                  options={tags?.data?.map((tag) => ({ label: tag.name, value: tag?.id || undefined })) || []}
                  label="Thành phần"
                  {...field}
                  onSelect={(v) => field.onChange(v)}
                />
              );
            }}
          </FormControl>
        </div>
        <div className="col-span-12">
          <FormControl name="description">
            {(field) => {
              return (
                <TextInput
                  label="Ghi chú"
                  {...field}
                  onChange={(e: EventTarget | MouseEvent | any) => field.onChange(e.target.value)}
                />
              );
            }}
          </FormControl>
        </div>
        <div className="ml-auto col-span-12">
          <TMButton htmlType="submit">Submit</TMButton>
        </div>
      </form>
    </FormProvider>
  );
};

const HistoryList = ({ history }: { history: IProduct[] }) => {
  return (
    <CardItem title={`Lịch sử tồn kho`} className="p-4">
      <div className="w-full flex flex-col gap-2">
        {history?.map((item: any) => {
          return (
            <div className={"py-2 px-4 rounded flex justify-between bg-slate-100"}>
              <div className="flex gap-2 items-start w-full ">
                <div className="flex gap-2 items-start flex-1">
                  <Icon
                    name={item.type == 0 ? "arrow-down" : "arrow-up"}
                    className={cn("w-6 shrink-0 mt-1", {
                      ["text-green-600"]: item.type == 0,
                      ["text-red-500"]: item.type == 1,
                    })}
                  />
                  <div className="flex flex-col gap-1 flex-1">
                    <h5
                      className={cn("text-xl font-semibold", {
                        ["text-green-600"]: item.type == 0,
                        ["text-red-500"]: item.type == 1,
                      })}
                    >
                      {item?.type == 0 ? "Nhập Kho" : "Xuất kho"}
                    </h5>
                    <p className="text-gray-500 font-normal text-base">
                      Số lượng: <span className="text-black font-bold">{item.quantity || 0}</span>
                      {item.productVariant?.skuCode ? (
                        <span className="ml-2 text-xs bg-slate-200 rounded px-1.5 py-0.5">
                          {item.productVariant.skuCode}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>
                <span className="px-2 text-slate-700 text-sm">{dayjs(item.createdAt).format("DD/MM/YYYY")}</span>
              </div>
            </div>
          );
        })}
      </div>
    </CardItem>
  );
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { warehouseId, cookie } = await parseCookieFromRequest(request);
  const { id } = params;
  if (!id) throw new Error("Không tìm thấy sản phẩm");
  const formData = await request.formData();

  // Attribute CRUD from the "Thuộc tính" tab
  const attributeName = formData.get("attributeName") as string | null;
  const attributeId = formData.get("attributeId") as string | null;
  const rawValues = formData.get("attributeValues") as string | null;
  const values = rawValues ? (JSON.parse(rawValues) as string[]) : [];

  switch (formData.get("_action")) {
    case "syncVariants": {
      const payload = JSON.parse((formData.get("payload") as string) || "{}");
      return productService.syncProductVariants({ id, cookie, warehouseId, ...payload });
    }
    case "updateVariant": {
      const variantId = formData.get("variantId") as string | null;
      const skuCode = formData.get("skuCode") as string | null;
      // Empty price input clears the override -> variant inherits product price
      const prices: Record<string, unknown> = {};
      for (const key of ["salePrice", "regularPrice", "wholeSalePrice", "costPrice"]) {
        const raw = formData.get(key);
        if (raw !== null) {
          const str = String(raw).trim();
          prices[key] = str === "" ? null : Number(str.replace(/,/g, ""));
        }
      }
      const quantityRaw = formData.get("quantity");
      const hasQuantity = quantityRaw !== null && String(quantityRaw).trim() !== "";
      return productService.updateVariant({
        id,
        variantId: variantId || "",
        cookie,
        warehouseId,
        ...(skuCode ? { skuCode } : {}),
        ...prices,
        ...(hasQuantity ? { quantity: Number(String(quantityRaw).replace(/,/g, "")) } : {}),
        ...(formData.get("isNegative") !== null ? { isNegative: formData.get("isNegative") === "1" } : {}),
      });
    }
    case "deleteVariant":
      return productService.deleteVariant({
        id,
        variantId: (formData.get("variantId") as string) || "",
        cookie,
      });
    case "createAttribute":
      return productService.createProductAttribute({ id, cookie, name: attributeName || "", values });
    case "updateAttribute":
      return productService.updateProductAttribute({
        id,
        attributeId: attributeId || "",
        cookie,
        ...(attributeName ? { name: attributeName } : {}),
        values,
      });
    case "deleteAttribute":
      return productService.deleteProductAttribute({ id, attributeId: attributeId || "", cookie });
    default:
      break;
  }

  const data = (await formData.get("data")) as string;
  const dataJson = JSON.parse(data);
  const bodyData = { ...dataJson.data, warehouseId, cookie };
  const resp = await productService.updateProduct(bodyData);
  return resp;
};

export function ErrorBoundary() {
  return <ErrorComponent />;
}

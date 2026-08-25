import { useCallback, useMemo } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { TextInput } from "../text-input";
import { NumberStepper } from "../number-stepper";
import { SelectInput } from "../select-input";
import { CheckboxInput } from "../checkbox-input";
import { TMButton } from "~/components/tm-button";
import { TMTable } from "~/components/tm-table";
import { Icon } from "~/components/icon";
import { useTranslation } from "~/i18n";
import { useOutletContext } from "@remix-run/react";
import { IVendorSettings } from "~/action.server/setting.service";

export interface IVariantAttributeDraft {
  /** Present on attributes loaded from the server (edit mode) */
  id?: number | string;
  name: string;
  values: string;
}

/** One variant row: its option map plus the practical product fields */
export interface IVariantDraft {
  /** Present on variants loaded from the server (edit mode) */
  variantId?: number | string;
  options: Record<string, string>;
  skuCode?: number | string;
  quantity?: number | string;
  costPrice?: number | string;
  regularPrice?: number | string;
  salePrice?: number | string;
  wholeSalePrice?: number | string;
  isNegative?: boolean;
}

/** Cartesian product of the drafted attribute values.
 *  Accepts comma-separated strings (`"Red, Blue"`) or arrays. */
export const buildCombos = (attributes: { name: string; values: string | string[] }[]): Record<string, string>[] => {
  const usable = attributes
    .map((a) => ({
      name: (a?.name || "").trim(),
      values: Array.isArray(a?.values)
        ? a.values
        : String(a?.values || "")
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
    }))
    .filter((a) => a.name && a.values.length > 0);
  if (!usable.length) return [];
  let combos: Record<string, string>[] = [{}];
  for (const attr of usable) {
    const next: Record<string, string>[] = [];
    for (const combo of combos) {
      for (const v of attr.values) next.push({ ...combo, [attr.name]: v });
    }
    combos = next;
  }
  return combos;
};

type MoneyKey = "costPrice" | "regularPrice" | "salePrice" | "wholeSalePrice";

/**
 * Attribute-matrix + variant-table editor for variable products.
 *
 * No mode switch: users curate exactly the variant list they want.
 * - "Tự sinh biến thể" appends every attribute combination not yet listed
 * - "Thêm biến thể" appends a blank row; attribute values are picked per row
 *
 * Must be used inside the product FormProvider (`variantAttributes`, `variants`).
 */
export const VariantEditor = () => {
  const { settings } = useOutletContext<{ settings: IVendorSettings }>();
  const moneyStep = Number(settings?.moneyStep) > 0 ? Number(settings.moneyStep) : 1000;
  const { t } = useTranslation();
  const form = useFormContext();

  const {
    fields: variantFields,
    append,
    remove,
  } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  const watchedVariants: IVariantDraft[] = useWatch({ control: form.control, name: "variants" }) || [];

  const watchedAttrs: IVariantAttributeDraft[] = useWatch({ control: form.control, name: "variantAttributes" }) || [];

  const usableAttrs = useMemo(
    () =>
      watchedAttrs
        .map((a) => ({
          name: (a?.name || "").trim(),
          values: (a?.values || "")
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
        }))
        .filter((a) => a.name && a.values.length > 0),
    [JSON.stringify(watchedAttrs)],
  );

  /** Canonical key used to deduplicate variants by their option combination */
  const optionKeyOf = (options: Record<string, string> | undefined) =>
    Object.entries(options || {})
      .filter(([, v]) => String(v ?? "").trim() !== "")
      .map(([k, v]) => `${k}:${String(v).trim().toLowerCase()}`)
      .sort()
      .join("|");

  /**
   * Generate every attribute combination that doesn't exist yet and append
   * them to the list (existing rows are left untouched).
   */
  const generateVariant = useCallback(() => {
    if (!usableAttrs.length) return;
    const current = form.getValues("variants") || [];
    const existingKeys = new Set(current.map((v: any) => optionKeyOf(v?.options)));
    const fresh = buildCombos(usableAttrs)
      .filter((options) => !existingKeys.has(optionKeyOf(options)))
      .map((options) => ({ options, quantity: "", isNegative: false }));
    if (!fresh.length) return;
    form.setValue("variants", [...current, ...fresh] as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(usableAttrs)]);

  const addNewVariant = () => append({ options: {}, quantity: "", isNegative: false });

  console.log("usableAttrs", usableAttrs);
  /** Column set bound to `variants.<index>.*` form paths */
  const columns = [
    {
      title: t("product.variant"),
      dataIndex: "options",
      render: (r: any) => (
        <div className="flex flex-wrap gap-1">
          {usableAttrs.length === 0 && Object.keys(r.options || {}).length === 0 ? (
            <span className="text-slate-400 text-xs">{t("product.newVariant")}</span>
          ) : (
            usableAttrs.map((a) => (
              <span key={a.name} className="bg-slate-100 rounded px-1.5 py-0.5 text-xs">
                {a.name}: {String((r.options || {})[a.name] ?? "---")}
              </span>
            ))
          )}
        </div>
      ),
      className: "w-28",
    },
    {
      title: t("product.sku"),
      dataIndex: "skuCode",
      render: (r: any) => (
        <TextInput
          value={(form.watch(`variants.${r.index}.skuCode`) as string) || ""}
          onChange={(e: any) => form.setValue(`variants.${r.index}.skuCode`, e.target.value as any)}
        />
      ),
      className: "w-40",
    },
    {
      title: t("product.openingStock"),
      dataIndex: "quantity",
      render: (r: any) => (
        <NumberStepper
          value={form.watch(`variants.${r.index}.quantity`)}
          step={1}
          onValueChange={(v) => form.setValue(`variants.${r.index}.quantity`, v.value as any)}
        />
      ),
      className: "w-40",
    },
    ...(["costPrice", "regularPrice", "salePrice", "wholeSalePrice"] as MoneyKey[]).map((key) => ({
      title:
        key === "costPrice"
          ? t("product.costPrice")
          : key === "regularPrice"
          ? t("product.regularPrice")
          : key === "salePrice"
          ? t("product.salePrice")
          : t("product.wholeSalePrice"),
      dataIndex: key,
      render: (r: any) => (
        <NumberStepper
          value={form.watch(`variants.${r.index}.${key}`)}
          step={moneyStep}
          onValueChange={(v) => form.setValue(`variants.${r.index}.${key}`, v.value as any)}
        />
      ),
      className: "w-40",
    })),
    {
      title: t("product.allowNegative"),
      dataIndex: "isNegative",
      render: (r: any) => (
        <CheckboxInput
          value={!!form.watch(`variants.${r.index}.isNegative`)}
          onChange={(e: any) => form.setValue(`variants.${r.index}.isNegative`, e.target.checked)}
        />
      ),
    },
    {
      title: "",
      dataIndex: "remove",
      render: (r: any) => (
        <TMButton variant="ghost" size="xs" onClick={() => remove(r.index)}>
          <Icon name="trash-2" fontSize={14} />
        </TMButton>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-2 h-full">
      <AttributeVariant />

      <div className="w-full h-[1px] bg-slate-300 my-4" />

      {variantFields.length === 0 && <div className="text-sm text-slate-500 py-2">{t("product.noVariants")}</div>}

      {variantFields.length > 0 && (
        <TMTable
          scrollable
          columns={columns}
          data={variantFields.map((_, index) => ({
            index,
            options: watchedVariants[index]?.options || {},
          }))}
          rowKey="index"
        />
      )}

      {/* Sticky action pair: auto-generate missing combos vs. blank row */}
      <div className="sticky bottom-0 grid grid-cols-2 gap-2 bg-white pt-2">
        <button
          type="button"
          disabled={!usableAttrs.length}
          onClick={generateVariant}
          className="flex flex-col items-center justify-center gap-1 py-2 border border-dashed border-slate-400 rounded bg-slate-100 text-slate-600 hover:border-indigo-500 hover:text-indigo-600 disabled:opacity-40 transition-colors cursor-pointer"
        >
          <Icon name="plus" fontSize={16} />
          <span className="text-xs">{t("product.generateAllVariants")}</span>
        </button>
        <button
          type="button"
          onClick={addNewVariant}
          className="flex flex-col items-center justify-center gap-1 py-2 border border-dashed border-slate-400 rounded bg-slate-100 text-slate-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors cursor-pointer"
        >
          <Icon name="plus" fontSize={16} />
          <span className="text-xs">{t("product.addVariant")}</span>
        </button>
      </div>
    </div>
  );
};

const AttributeVariant = () => {
  const form = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variantAttributes",
  });
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-lg">Thuộc tính</span>
      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2 items-end">
          <div className="w-56">
            <TextInput
              label={index === 0 ? t("product.attributeName") : undefined}
              {...form.register(`variantAttributes.${index}.name` as const)}
            />
          </div>
          <div className="flex-1">
            <TextInput
              label={index === 0 ? t("product.attributeValuesHint") : undefined}
              {...form.register(`variantAttributes.${index}.values` as const)}
            />
          </div>
          <TMButton size="xs" onClick={() => remove(index)} className="py-2 px-2 mb-0.5">
            <Icon name="trash-2" fontSize={14} />
          </TMButton>
        </div>
      ))}
      <div>
        <button
          type="button"
          onClick={() => append({ name: "", values: "" })}
          className="w-56 py-1 border border-dashed border-slate-300 rounded text-xs text-slate-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors cursor-pointer"
        >
          {t("product.addAttribute")}
        </button>
      </div>
    </div>
  );
};

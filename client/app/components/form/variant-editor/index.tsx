import { useFetcher, useLoaderData, useOutletContext, useRevalidator } from "@remix-run/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import type { IVendorSettings } from "~/types/setting";
import { Icon } from "~/components/icon";
import { TMButton } from "~/components/tm-button";
import { TMModal } from "~/components/tm-modal";
import { useTranslation } from "~/i18n";
import { SwitchInput } from "../switch-input";
import { CreatableSelectInput } from "../creatable-select-input";
import { CreatableTagInput, Option } from "../creatable-tag-input";
import { NumberStepper } from "../number-stepper";
import { TextInput } from "../text-input";
import { SelectInput } from "../select-input";
import { useSubmitPromise } from "~/hooks";
import { ProductSchemaType } from "~/constants/schema/product";
import type { IProductBarcode } from "~/types/product";
import { normalizeValues } from "~/libs/normalize";
import { AttributeVariant } from "./attribute";

export type AttributeValueOption = Option;
export interface VariantEditorProps {
  /** Values copied from a simple product's type-0 default variant. */
  seed?: Partial<IVariantDraft>;
  protectFirstVariant?: boolean;
  units?: { id: number | string; name: string }[];
  type: 0 | 1 | 2;
}
export interface IVariantAttributeDraft {
  id?: number | string;
  name: string;
  values: AttributeValueOption[];
}
export interface BarCodeManagerProps {
  index: number;
  rows: IProductBarcode[];
  units: { id: number | string; name: string }[];
  moneyStep: number;
  setVariant: (index: number, key: string, value: unknown) => void;
  skuCode: string;
  setSkuCode: (value: string) => void;
  quantity?: number | string;
  setQuantity: (value: number | undefined) => void;
  VAT?: number | string | null;
  setVAT: (value: number | undefined) => void;
}
export interface IVariantDraft {
  variantId?: number | string;
  options: Record<string, string>;
  skuCode?: number | string;
  quantity?: number | string;
  barcodes?: any[];
  isNegative?: boolean;
  VAT?: number | string | null;
  isActive?: boolean;
}

export const buildCombos = (attributes: { name: string; values: any }[]): Record<string, string>[] => {
  const usable = attributes
    .map((a) => ({
      name: (a?.name || "").trim(),
      values: normalizeValues(a?.values),
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

/** Keep variant options in sync with the attributes currently selected above. */
export const filterVariantOptionsByAttributes = (
  options: Record<string, string> | undefined,
  attributes: IVariantAttributeDraft[],
): Record<string, string> => {
  const selected = new Map(
    attributes
      .map((attribute) => {
        const name = String(attribute?.name || "").trim();
        const values = Array.isArray(attribute?.values)
          ? attribute.values
              .map((value) => (typeof value === "string" ? value : value?.value))
              .map((value) =>
                String(value || "")
                  .trim()
                  .toLowerCase(),
              )
              .filter(Boolean)
          : [];
        return [name.toLowerCase(), { name, values: new Set(values) }] as const;
      })
      .filter(([name, attribute]) => name && attribute.values.size > 0),
  );

  return Object.entries(options || {}).reduce<Record<string, string>>((result, [name, value]) => {
    const selectedAttribute = selected.get(name.trim().toLowerCase());
    const normalizedValue = String(value ?? "").trim();
    if (selectedAttribute && selectedAttribute.values.has(normalizedValue.toLowerCase())) {
      result[selectedAttribute.name] = normalizedValue;
    }
    return result;
  }, {});
};

export const VariantEditor = (
  { seed, protectFirstVariant = false, units = [], type }: VariantEditorProps = { type: 0 },
) => {
  const { settings } = useOutletContext<{ settings: IVendorSettings }>();
  const moneyStep = Number(settings?.moneyStep) > 0 ? Number(settings.moneyStep) : 1000;
  const { t } = useTranslation();
  const form = useFormContext<ProductSchemaType>();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulk, setBulk] = useState<Record<string, { enabled: boolean; value: any }>>({
    regularPrice: { enabled: false, value: "" },
    costPrice: { enabled: false, value: "" },
    wholeSalePrice: { enabled: false, value: "" },
    salePrice: { enabled: false, value: "" },
    quantity: { enabled: false, value: "" },
    isActive: { enabled: false, value: true },
  });
  const {
    fields: variantFields,
    append,
    remove,
  } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  const watchedVariants = (useWatch({ control: form.control, name: "variants" }) || []) as IVariantDraft[];
  const watchedAttrs: IVariantAttributeDraft[] = useWatch({ control: form.control, name: "variantAttributes" }) || [];

  const usableAttrs = useMemo(() => {
    return watchedAttrs
      .map((a) => ({
        name: (a?.name || "").trim(),
        values: Array.isArray(a?.values)
          ? (a.values as AttributeValueOption[])
              .map((o) => (typeof o === "string" ? String(o) : o.value))
              .filter(Boolean)
          : [],
      }))
      .filter((a) => a.name && a.values.length > 0);
  }, [JSON.stringify(watchedAttrs)]);

  useEffect(() => {
    const variants = form.getValues("variants") || [];
    const filteredVariants = variants.map((variant: any) => {
      const options = filterVariantOptionsByAttributes(variant?.options, watchedAttrs);
      const currentOptions = variant?.options || {};
      const hasChanged =
        Object.keys(options).length !== Object.keys(currentOptions).length ||
        Object.entries(options).some(([name, value]) => currentOptions[name] !== value);
      return hasChanged ? { ...variant, options } : variant;
    });

    if (filteredVariants.some((variant: any, index) => variant !== variants[index])) {
      form.setValue("variants", filteredVariants as any, { shouldDirty: true });
    }
  }, [form, JSON.stringify(watchedAttrs)]);

  const optionKeyOf = (options: Record<string, string> | undefined) =>
    Object.entries(options || {})
      .filter(([, v]) => String(v ?? "").trim() !== "")
      .map(([k, v]) => `${k}:${String(v).trim().toLowerCase()}`)
      .sort()
      .join("|");

  const generateVariant = useCallback(() => {
    if (!usableAttrs.length) return;
    const current = form.getValues("variants") || [];
    const combos = buildCombos(usableAttrs as any);
    const protectedIndex = protectFirstVariant
      ? current.findIndex((v: any) => v?.variantId && Object.keys(v?.options || {}).length === 0)
      : -1;
    if (protectedIndex >= 0 && combos.length > 0) {
      current[protectedIndex] = {
        ...current[protectedIndex],
        options: combos[0],
      };
      form.setValue("variants", current as any, { shouldDirty: true });
    }
    const currentKeys = new Set(current.map((v: any) => optionKeyOf(v?.options)));
    const fresh = combos
      .filter((options) => !currentKeys.has(optionKeyOf(options)))
      .map((options) => ({ ...seed, options }));
    if (!fresh.length) return;
    form.setValue("type", 1, { shouldDirty: true });
    form.setValue("variants", [...current, ...fresh] as any);
  }, [JSON.stringify(usableAttrs), JSON.stringify(seed)]);

  const addNewVariant = () => {
    const base = form.getValues();
    form.setValue("type", 1, { shouldDirty: true });
    append({
      options: {},
      ...(seed || {
        quantity: base.quantity,
        isNegative: base.isNegative,
        barcodes: [],
      }),
    } as any);
  };

  // helper to determine if selecting candidateValue for attrName at rowIndex would duplicate another row
  const isOptionDisabled = (attrName: string, candidateValue: string, rowIndex: number) => {
    const currentOpts = watchedVariants[rowIndex]?.options || {};
    const simulated = { ...currentOpts, [attrName]: candidateValue };
    // only consider fully specified combos (all attrs have value) for duplicate check?
    // Require every usableAttr to have a value in simulated to compare; if incomplete, allow.
    const hasAll = usableAttrs.every((a) => String((simulated as any)[a.name] ?? "").trim() !== "");
    if (!hasAll) return false;
    const key = optionKeyOf(simulated);
    for (let i = 0; i < watchedVariants.length; i++) {
      if (i === rowIndex) continue;
      if (optionKeyOf(watchedVariants[i]?.options) === key) return true;
    }
    return false;
  };

  const applyBulk = () => {
    watchedVariants.forEach((_, index) => {
      Object.entries(bulk).forEach(([key, item]) => {
        if (item.enabled)
          form.setValue(`variants.${index}.${key}` as any, key === "isActive" ? !!item.value : (item.value as any), {
            shouldDirty: true,
          });
      });
    });
    setBulkOpen(false);
  };
  const setVariant = (index: number, key: string, value: any) => {
    return form.setValue(`variants.${index}.${key}` as any, value, { shouldDirty: true });
  };
  const variantName = (variant: IVariantDraft) => {
    return (
      Object.values(variant.options || {})
        .filter(Boolean)
        .join(" / ") || t("product.newVariant")
    );
  };
  const isProductVariant = type === 1;
  console.log(`usableAttrs`, usableAttrs);
  return (
    <div className="flex flex-col gap-2 h-full">
      {isProductVariant && (
        <>
          <AttributeVariant /> <div className="w-full h-[1px] bg-slate-300 my-4" />
          {variantFields.length === 0 && <div className="text-sm text-slate-500 py-2">{t("product.noVariants")}</div>}
          <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
            <div>
              <p className="font-medium text-slate-800 dark:text-white">{t("product.variantsTab")}</p>
              <p className="text-xs text-slate-500">
                {variantFields.length} {t("product.variant")}
              </p>
            </div>
            <TMButton type="button" size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
              <Icon name="edit-3" fontSize={14} /> Cập nhật hàng loạt
            </TMButton>
          </div>
        </>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
        {variantFields.map((field, index) => {
          const variant = watchedVariants[index] || ({} as IVariantDraft);
          // Basic products always keep their sole default variant. It is the
          // sellable record for the product and therefore cannot be deleted.
          const locked = type === 0 || (protectFirstVariant && index === 0 && !!variant.variantId);
          const isOpen = type !== 1 || expanded === index;
          return (
            <div key={field.id} className="border-b last:border-b-0 border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-[minmax(150px,1.4fr)_minmax(130px,1fr)_minmax(120px,1fr)_minmax(150px,1fr)_auto] items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <div className="flex min-w-0 items-center gap-2">
                  {type === 1 && (
                    <button
                      type="button"
                      className="rounded p-1 text-primary hover:bg-indigo-50"
                      aria-label="Toggle variant details"
                      aria-expanded={isOpen}
                      onClick={() => setExpanded(isOpen ? null : index)}
                    >
                      <Icon name={isOpen ? "chevron-up" : "chevron-down"} fontSize={16} />
                    </button>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{variantName(variant)}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {usableAttrs.map((a) => (
                        <SelectInput
                          key={a.name}
                          disabled={locked}
                          value={variant.options?.[a.name] || ""}
                          options={a.values.map((v) => ({
                            label: v,
                            value: v,
                            disabled: isOptionDisabled(a.name, v, index),
                          }))}
                          placeholder={a.name}
                          onSelect={(v: any) =>
                            setVariant(index, "options", { ...variant.options, [a.name]: v || undefined })
                          }
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  <span className="block">SKU: {variant.skuCode || "—"}</span>
                  <span>Barcode: {variant.barcodes?.find((row) => row.isBaseUnit)?.barcode || "—"}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium">{variant.quantity ?? 0}</span>
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${
                      variant.isNegative ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {variant.isNegative ? "Âm cho phép" : "Không âm"}
                  </span>
                </div>
                <div className="text-sm font-medium">
                  {Number(variant.barcodes?.find((row) => row.isBaseUnit)?.retailPrice || 0).toLocaleString()}
                </div>
                <div className="flex items-center gap-1">
                  {!locked && (
                    <TMButton
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => remove(index)}
                      aria-label="Delete variant"
                    >
                      <Icon name="trash-2" fontSize={15} />
                    </TMButton>
                  )}
                  <SwitchInput
                    checked={variant.isActive !== false}
                    onChange={(event: any) => setVariant(index, "isActive", event.target.checked)}
                    aria-label="Toggle variant status"
                  />
                </div>
              </div>
              {isOpen && (
                <div className="bg-slate-50 p-4 dark:bg-slate-800/40">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <BarcodeManager
                      index={index}
                      rows={variant.barcodes || []}
                      units={units}
                      moneyStep={moneyStep}
                      setVariant={setVariant}
                      skuCode={String(variant.skuCode ?? "")}
                      setSkuCode={(value) => setVariant(index, "skuCode", value)}
                      quantity={variant.quantity}
                      setQuantity={(value) => setVariant(index, "quantity", value)}
                      VAT={variant.VAT}
                      setVAT={(value) => setVariant(index, "VAT", value)}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isProductVariant && (
        <div className="sticky bottom-0 grid grid-cols-2 gap-2 bg-white pt-2">
          <TMButton
            type="button"
            disabled={!usableAttrs.length}
            onClick={generateVariant}
            className="flex flex-col items-center justify-center gap-1 py-2 border border-dashed border-slate-400 rounded bg-slate-100 text-slate-600 hover:border-indigo-500 hover:text-primary disabled:opacity-40 transition-colors cursor-pointer"
          >
            {/* <Icon name="plus" fontSize={16} /> */}
            <span className="text-xs">{t("product.generateAllVariants")}</span>
          </TMButton>
          <TMButton
            type="button"
            onClick={addNewVariant}
            className="flex flex-col items-center justify-center gap-1 py-2 border border-dashed border-slate-400 rounded bg-slate-100 text-slate-600 hover:border-indigo-500 hover:text-primary transition-colors cursor-pointer"
          >
            {/* <Icon name="plus" fontSize={16} /> */}
            <span className="text-xs">{t("product.addVariant")}</span>
          </TMButton>
        </div>
      )}
      <TMModal open={bulkOpen} close={() => setBulkOpen(false)} width={560} title="Cập nhật hàng loạt">
        <div className="flex w-full flex-col gap-4">
          <p className="text-sm text-slate-500">Chọn trường và giá trị muốn áp dụng cho tất cả biến thể hiện tại.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ["regularPrice", "Giá bán lẻ"],
              ["costPrice", "Giá gốc"],
              ["wholeSalePrice", "Giá sỉ"],
              ["salePrice", "Giá khuyến mãi"],
              ["quantity", "Tồn kho"],
              ["isActive", "Trạng thái"],
            ].map(([key, label]) => (
              <label
                key={key}
                className="flex items-center gap-2 rounded border border-slate-200 p-2 dark:border-slate-700"
              >
                <input
                  type="checkbox"
                  checked={!!bulk[key]?.enabled}
                  onChange={(e) => setBulk((old) => ({ ...old, [key]: { ...old[key], enabled: e.target.checked } }))}
                />
                <span className="flex-1 text-sm">{label}</span>
                {key === "isActive" ? (
                  <SwitchInput
                    checked={!!bulk[key]?.value}
                    onChange={(e: any) =>
                      setBulk((old) => ({ ...old, [key]: { ...old[key], value: e.target.checked } }))
                    }
                  />
                ) : (
                  <input
                    className="w-24 rounded border border-slate-300 px-2 py-1 text-sm"
                    type="number"
                    value={bulk[key]?.value ?? ""}
                    onChange={(e) => setBulk((old) => ({ ...old, [key]: { ...old[key], value: e.target.value } }))}
                  />
                )}
              </label>
            ))}{" "}
          </div>
          <div className="flex justify-end gap-2 border-t pt-3">
            <TMButton type="button" variant="ghost" onClick={() => setBulkOpen(false)}>
              Hủy
            </TMButton>
            <TMButton type="button" onClick={applyBulk}>
              Áp dụng
            </TMButton>
          </div>
        </div>
      </TMModal>
    </div>
  );
};

const BarcodeManager = ({ index, rows, units, moneyStep, setVariant, skuCode, setSkuCode, quantity, setQuantity, VAT, setVAT }: BarCodeManagerProps) => {
  const update = (rowIndex: number, key: keyof IProductBarcode, value: unknown) => {
    const next = rows.map((row, current) =>
      current === rowIndex
        ? { ...row, [key]: value, isBaseUnit: key === "conversionRate" ? Number(value) === 1 : row.isBaseUnit }
        : row,
    );
    setVariant(index, "barcodes", next);
  };
  const row = rows[0];
  if (!row) return null;
  return (
    <div className="col-span-full">
      <div className="grid grid-cols-1 gap-3 rounded border border-slate-200 p-3 dark:border-slate-700">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            <TextInput label="SKU" value={skuCode} onChange={(event: any) => setSkuCode(event.target.value)} />
            <TextInput label="Barcode" value={row.barcode} onChange={(event: any) => update(0, "barcode", event.target.value)} />
            <NumberStepper label="Tồn kho" value={quantity} step={1} onValueChange={(value) => setQuantity(value.float)} />
            <SelectInput label="Đơn vị" value={row.unitId} options={units.map((unit) => ({ label: unit.name, value: unit.id }))} onSelect={(value: any) => update(0, "unitId", value)} />
            <NumberStepper label="Quy đổi đơn vị gốc" value={row.conversionRate} step={1} onValueChange={(value) => update(0, "conversionRate", value.float)} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            <NumberStepper label="Giá vốn" value={row.costPrice} step={moneyStep} onValueChange={(value) => update(0, "costPrice", value.float)} />
            <NumberStepper label="Giá bán lẻ" value={row.retailPrice} step={moneyStep} onValueChange={(value) => update(0, "retailPrice", value.float)} />
            <NumberStepper label="Giá bán sỉ" value={row.wholesalePrice} step={moneyStep} onValueChange={(value) => update(0, "wholesalePrice", value.float)} />
            <NumberStepper label="Giá khuyến mãi" value={row.promoPrice ?? undefined} step={moneyStep} onValueChange={(value) => update(0, "promoPrice", value.float)} />
            <NumberStepper label="VAT (%)" value={VAT ?? undefined} step={1} onValueChange={(value) => setVAT(value.float)} />
          </div>
      </div>
    </div>
  );
};

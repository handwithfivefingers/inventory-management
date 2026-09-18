import { useOutletContext } from "@remix-run/react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Icon } from "~/components/icon";
import { TMButton } from "~/components/tm-button";
import { ProductSchemaType } from "~/constants/schema/product";
import { useTranslation } from "~/i18n";
import type { IVendorSettings } from "~/types/setting";
import { SelectInput } from "../select-input";
import { SwitchInput } from "../switch-input";
import { AttributeVariant } from "./attribute";
import { BarcodeManager } from "./barcode-manager";
import { BulkUpdateModal } from "./bulk-update-modal";
import type {
  AttributeValueOption,
  BulkUpdateFields,
  IVariantAttributeDraft,
  IVariantDraft,
  VariantEditorProps,
} from "./types";
import { buildCombos, filterVariantOptionsByAttributes, hasVariantOptionsChanged, optionKeyOf } from "./utils";
import { FormControl } from "../form-control";
import { TextInput } from "../text-input";
import { NumberStepper } from "../number-stepper";

export type {
  AttributeValueOption,
  BarcodeManagerProps,
  IVariantAttributeDraft,
  IVariantDraft,
  VariantEditorProps,
} from "./types";
export { buildCombos, filterVariantOptionsByAttributes } from "./utils";

const DEFAULT_BULK_FIELDS: BulkUpdateFields = {
  regularPrice: { enabled: false, value: "" },
  costPrice: { enabled: false, value: "" },
  wholeSalePrice: { enabled: false, value: "" },
  salePrice: { enabled: false, value: "" },
  quantity: { enabled: false, value: "" },
  isActive: { enabled: false, value: true },
};

const getUsableAttributes = (attributes: IVariantAttributeDraft[]) =>
  attributes
    .map((attribute) => ({
      name: (attribute?.name || "").trim(),
      values: Array.isArray(attribute?.values)
        ? (attribute.values as AttributeValueOption[])
            .map((option) => (typeof option === "string" ? option : option.value))
            .filter(Boolean)
        : [],
    }))
    .filter((attribute) => attribute.name && attribute.values.length > 0);

export const VariantEditor = (
  { seed, protectFirstVariant = false, units = [], type }: VariantEditorProps = { type: 0 },
) => {
  const { settings } = useOutletContext<{ settings: IVendorSettings }>();
  const { t } = useTranslation();
  const form = useFormContext<ProductSchemaType>();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [isBulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkFields, setBulkFields] = useState<BulkUpdateFields>(DEFAULT_BULK_FIELDS);
  const { fields: variantFields, append, remove } = useFieldArray({ control: form.control, name: "variants" });
  const variants = (useWatch({ control: form.control, name: "variants" }) || []) as IVariantDraft[];
  const attributes = (useWatch({
    control: form.control,
    name: "variantAttributes",
  }) || []) as IVariantAttributeDraft[];
  const moneyStep = Number(settings?.moneyStep) > 0 ? Number(settings.moneyStep) : 1000;
  const usableAttributes = useMemo(() => getUsableAttributes(attributes), [attributes]);

  useEffect(() => {
    const currentVariants = (form.getValues("variants") || []) as IVariantDraft[];
    const nextVariants = currentVariants.map((variant) => {
      const options = filterVariantOptionsByAttributes(variant.options, attributes);
      return hasVariantOptionsChanged(variant.options || {}, options) ? { ...variant, options } : variant;
    });

    if (nextVariants.some((variant, index) => variant !== currentVariants[index])) {
      form.setValue("variants", nextVariants as any, { shouldDirty: true });
    }
  }, [attributes, form]);

  const setVariant = (index: number, key: string, value: unknown) =>
    form.setValue(`variants.${index}.${key}` as any, value as any, {
      shouldDirty: true,
    });

  const generateVariants = useCallback(() => {
    if (!usableAttributes.length) return;

    const currentVariants = (form.getValues("variants") || []) as IVariantDraft[];
    const combinations = buildCombos(usableAttributes);
    const protectedIndex = protectFirstVariant
      ? currentVariants.findIndex(
          (variant) => Boolean(variant.variantId) && Object.keys(variant.options || {}).length === 0,
        )
      : -1;
    const variantsWithFirstCombination =
      protectedIndex >= 0 && combinations.length > 0
        ? currentVariants.map((variant, index) =>
            index === protectedIndex ? { ...variant, options: combinations[0] } : variant,
          )
        : currentVariants;
    const existingKeys = new Set(variantsWithFirstCombination.map((variant) => optionKeyOf(variant.options)));
    const newVariants = combinations
      .filter((options) => !existingKeys.has(optionKeyOf(options)))
      .map((options) => ({ ...seed, options }));

    if (!newVariants.length && variantsWithFirstCombination === currentVariants) return;
    form.setValue("type", 1, { shouldDirty: true });
    form.setValue("variants", [...variantsWithFirstCombination, ...newVariants] as any, { shouldDirty: true });
  }, [form, protectFirstVariant, seed, usableAttributes]);

  const addVariant = () => {
    const product = form.getValues();
    form.setValue("type", 1, { shouldDirty: true });
    append({
      options: {},
      ...(seed || {
        quantity: product.quantity,
        isNegative: product.isNegative,
        barcodes: [],
      }),
    } as any);
  };

  const isOptionDisabled = (attributeName: string, candidateValue: string, rowIndex: number) => {
    const simulatedOptions = {
      ...(variants[rowIndex]?.options || {}),
      [attributeName]: candidateValue,
    };
    const isCompleteCombination = usableAttributes.every(
      ({ name }) => String(simulatedOptions[name] ?? "").trim() !== "",
    );
    if (!isCompleteCombination) return false;

    const candidateKey = optionKeyOf(simulatedOptions);
    return variants.some((variant, index) => index !== rowIndex && optionKeyOf(variant.options) === candidateKey);
  };

  const applyBulkUpdate = () => {
    variants.forEach((_, index) => {
      Object.entries(bulkFields).forEach(([key, field]) => {
        if (field.enabled) setVariant(index, key, key === "isActive" ? Boolean(field.value) : field.value);
      });
    });
    setBulkModalOpen(false);
  };

  const variantName = (variant: IVariantDraft) =>
    Object.values(variant.options || {})
      .filter(Boolean)
      .join(" / ") || t("product.newVariant");
  const isVariableProduct = type === 1;

  return (
    <div className="flex h-full flex-col gap-2">
      {isVariableProduct && (
        <>
          <AttributeVariant />
          <div className="my-4 h-px w-full bg-slate-300" />
          {variantFields.length === 0 && <div className="py-2 text-sm text-slate-500">{t("product.noVariants")}</div>}
          <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
            <div>
              <p className="font-medium text-slate-800 dark:text-white">{t("product.variantsTab")}</p>
              <p className="text-xs text-slate-500">
                {variantFields.length} {t("product.variant")}
              </p>
            </div>
            <TMButton type="button" size="sm" variant="outline" onClick={() => setBulkModalOpen(true)}>
              <Icon name="edit-3" fontSize={14} /> Cập nhật hàng loạt
            </TMButton>
          </div>
        </>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
        {variantFields.map((field, index) => {
          const variant = variants[index] || ({} as IVariantDraft);
          const isLocked = type === 0 || (protectFirstVariant && index === 0 && Boolean(variant.variantId));
          const isExpanded = type !== 1 || expandedIndex === index;
          const baseBarcode = variant.barcodes?.find((row) => row.isBaseUnit);
          console.log("field", field);
          return (
            <div key={field.id} className="border-b border-slate-200 last:border-b-0 dark:border-slate-700">
              <div className="grid grid-cols-[minmax(150px,1.4fr)_minmax(130px,1fr)_minmax(120px,1fr)_minmax(150px,1fr)_auto] items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <div className="flex min-w-0 items-center gap-2">
                  {type === 1 && (
                    <button
                      type="button"
                      className="rounded p-1 text-primary hover:bg-indigo-50"
                      aria-label="Toggle variant details"
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedIndex(isExpanded ? null : index)}
                    >
                      <Icon name={isExpanded ? "chevron-up" : "chevron-down"} fontSize={16} />
                    </button>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{variantName(variant)}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {usableAttributes.map((attribute) => (
                        <SelectInput
                          key={attribute.name}
                          disabled={isLocked}
                          value={variant.options?.[attribute.name] || ""}
                          options={attribute.values.map((value) => ({
                            label: value,
                            value,
                            disabled: isOptionDisabled(attribute.name, value, index),
                          }))}
                          placeholder={attribute.name}
                          onSelect={(value: any) =>
                            setVariant(index, "options", {
                              ...variant.options,
                              [attribute.name]: value || undefined,
                            })
                          }
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  <span className="block">SKU: {variant.skuCode || "—"}</span>
                  <span>Barcode: {baseBarcode?.barcode || "—"}</span>
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
                <div className="text-sm font-medium">{Number(baseBarcode?.retailPrice || 0).toLocaleString()}</div>
                <div className="flex items-center gap-1">
                  {!isLocked && (
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
              {isExpanded && (
                <div className="bg-slate-50 p-2 dark:bg-slate-800/40">
                  <div className="flex gap-2">
                    <FormControl name={`variants.${index}.imageUrl`}>
                      <img src="https://placehold.co/200x150" />
                    </FormControl>
                    <div className="flex flex-col">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        <FormControl name={`variants.${index}.skuCode`}>
                          <TextInput placeholder="SKU" label="SKU" />
                        </FormControl>
                        <FormControl name={`variants.${index}.quantity`}>
                          {(f) => (
                            <NumberStepper
                              label="Tồn kho"
                              value={f.value}
                              step={1}
                              onValueChange={(v) => f.onChange(v.value)}
                            />
                          )}
                        </FormControl>

                        <FormControl name={`variants.${index}.isNegative`}>
                          {(f) => (
                            <div className="flex flex-col gap-2">
                              <span className="block text-sm/6 font-medium text-gray-900 dark:text-slate-200">
                                Tồn âm
                              </span>
                              <SwitchInput
                                value={f.value}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => f.onChange(e.target.checked)}
                              />
                            </div>
                          )}
                        </FormControl>

                        <FormControl name={`variants.${index}.barcodes.0.costPrice`}>
                          {(f) => (
                            <NumberStepper
                              label="Giá vốn"
                              value={f.value}
                              step={moneyStep}
                              onValueChange={(v) => f.onChange(v.value)}
                            />
                          )}
                        </FormControl>

                        <FormControl name={`variants.${index}.barcodes.0.retailPrice`}>
                          {(f) => (
                            <NumberStepper
                              label="Giá bán lẻ"
                              value={f.value}
                              step={moneyStep}
                              onValueChange={(v) => f.onChange(v.value)}
                            />
                          )}
                        </FormControl>

                        <FormControl name={`variants.${index}.VAT`}>
                          {(f) => (
                            <NumberStepper
                              label="VAT (%)"
                              value={f.value}
                              step={1}
                              onValueChange={(v) => f.onChange(v.value)}
                            />
                          )}
                        </FormControl>
                        <div className="flex items-end">
                          <BarcodeManager index={index} units={units} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isVariableProduct && (
        <div className="sticky bottom-0 grid grid-cols-2 gap-2 bg-white pt-2">
          <TMButton
            type="button"
            disabled={!usableAttributes.length}
            onClick={generateVariants}
            className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded border border-dashed border-slate-400 bg-slate-100 py-2 text-slate-600 transition-colors hover:border-indigo-500 hover:text-primary disabled:opacity-40"
          >
            <span className="text-xs">{t("product.generateAllVariants")}</span>
          </TMButton>
          <TMButton
            type="button"
            onClick={addVariant}
            className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded border border-dashed border-slate-400 bg-slate-100 py-2 text-slate-600 transition-colors hover:border-indigo-500 hover:text-primary"
          >
            <span className="text-xs">{t("product.addVariant")}</span>
          </TMButton>
        </div>
      )}

      <BulkUpdateModal
        open={isBulkModalOpen}
        fields={bulkFields}
        onFieldsChange={setBulkFields}
        onClose={() => setBulkModalOpen(false)}
        onApply={applyBulkUpdate}
      />
    </div>
  );
};

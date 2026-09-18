import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "~/i18n";
import type { IVariantAttributeDraft } from ".";
import { useFetcher, useLoaderData, useRevalidator } from "@remix-run/react";
import { useSubmitPromise } from "~/hooks";
import { useEffect, useMemo, useRef } from "react";
import { CreatableTagInput, Option } from "../creatable-tag-input";
import { ProductSchemaType } from "~/constants/schema/product";
import { CreatableSelectInput } from "../creatable-select-input";
import { TMButton } from "~/components/tm-button";
import { Icon } from "~/components/icon";

export type AttributeValueOption = Option;

interface AttributeRowProps {
  attribute: IVariantAttributeDraft;
  attributeNameOptions: Option[];
  attributeNameLabel?: string;
  attributeValuesLabel?: string;
  getValueSuggestions: (attributeName: string, currentValues: Option[]) => Option[];
  index: number;
  isAttributeNameTaken: (attributeName: string, currentIndex: number) => boolean;
  onCreateAttribute: (attributeName: string) => void;
  onCreateValue: (attributeName: string, currentValues: Option[], nextValues: Option[], createdValue?: Option) => void;
  onRemove: (index: number) => void;
  updateAttribute: (index: number, attribute: IVariantAttributeDraft) => void;
}

const AttributeRow = ({
  attribute,
  attributeNameOptions,
  attributeNameLabel,
  attributeValuesLabel,
  getValueSuggestions,
  index,
  isAttributeNameTaken,
  onCreateAttribute,
  onCreateValue,
  onRemove,
  updateAttribute,
}: AttributeRowProps) => {
  const form = useFormContext<ProductSchemaType>();
  const { replace } = useFieldArray({
    control: form.control,
    name: `variantAttributes.${index}.values` as const,
  });
  const watchedValues = useWatch({
    control: form.control,
    name: `variantAttributes.${index}.values` as const,
  });
  const currentName = String(attribute.name || "").trim();
  const normalizedValue: AttributeValueOption[] = Array.isArray(watchedValues)
    ? watchedValues
        .map((value) => (typeof value === "string" ? { label: value, value } : value))
        .filter((value): value is AttributeValueOption => Boolean(value?.value))
    : [];
  const suggestions = getValueSuggestions(currentName, normalizedValue);

  const updateName = (name: string) => {
    if (isAttributeNameTaken(name, index)) return;
    updateAttribute(index, { ...attribute, name });
    void form.trigger(`variantAttributes.${index}`);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
      <div className="w-full sm:w-56 shrink-0">
        <CreatableSelectInput
          label={attributeNameLabel}
          value={currentName || undefined}
          options={attributeNameOptions}
          placeholder="Chọn hoặc tạo thuộc tính"
          onSelect={updateName}
          onCreate={(input) => {
            const trimmed = input.trim();
            if (!trimmed || isAttributeNameTaken(trimmed, index)) return;
            updateName(trimmed);
            onCreateAttribute(trimmed);
          }}
        />
      </div>
      <div className="flex-1">
        <CreatableTagInput
          label={attributeValuesLabel}
          value={normalizedValue}
          options={suggestions}
          onChange={(next, createdValue) => {
            replace(next);
            void form.trigger(`variantAttributes.${index}.values`);
            onCreateValue(currentName, normalizedValue, next, createdValue);
          }}
          placeholder={currentName ? `Giá trị cho ${currentName} — Enter để tạo` : "Chọn thuộc tính trước"}
        />
      </div>
      <TMButton
        size="xs"
        onClick={() => onRemove(index)}
        className="py-2 px-2 mb-0.5 bg-danger/10 text-danger hover:bg-danger/20"
      >
        <Icon name="trash-2" fontSize={14} />
      </TMButton>
    </div>
  );
};

export const AttributeVariant = () => {
  const loaderData: any = useLoaderData();
  const form = useFormContext<ProductSchemaType>();

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "variantAttributes",
  });
  const { t } = useTranslation();
  const watchedAttrs = form.watch(`variantAttributes`) || [];

  const createAttrFetcher = useFetcher();
  const { submit, isLoading } = useSubmitPromise();
  const revalidator = useRevalidator();
  const wasCreatingValue = useRef(false);
  const wasCreatingAttr = useRef(false);
  useEffect(() => {
    if (createAttrFetcher.state !== "idle") {
      wasCreatingAttr.current = true;
      return;
    }
    if (wasCreatingAttr.current && createAttrFetcher.data) {
      wasCreatingAttr.current = false;
      revalidator.revalidate();
    }
  }, [createAttrFetcher.state, createAttrFetcher.data, revalidator.revalidate]);

  useEffect(() => {
    if (isLoading) {
      wasCreatingValue.current = true;
      return;
    }
    if (wasCreatingValue.current) {
      wasCreatingValue.current = false;
      revalidator.revalidate();
    }
  }, [isLoading, revalidator.revalidate]);

  // Vendor-global attribute catalog: unique per vendor (Size {sm,md,lg}, Color {red,green})
  let vendorAttrs: {
    id: number | string;
    name: string;
    values: { id: number | string; value: string }[];
  }[] = [];
  let globalMap: Record<string, Option[]> = {};
  try {
    const globalAttrs: any[] =
      loaderData?.suggestedAttributes || loaderData?.attributesData || loaderData?.data?.attributes || [];
    if (Array.isArray(globalAttrs)) {
      // already deduped per vendor in backend listAttributes
      vendorAttrs = globalAttrs
        .map((g: any) => ({
          id: g.id,
          name: String(g.name || "").trim(),
          values: (g.values || [])
            .map((v: any) => ({
              id: v.id,
              value: String(v.value ?? v.label ?? "").trim(),
            }))
            .filter((v: any) => v.value),
        }))
        .filter((a: any) => a.name);
      for (const g of vendorAttrs) {
        const key = g.name.trim().toLowerCase();
        if (!key) continue;
        globalMap[key] = g.values.map((v) => ({
          label: v.value,
          value: v.value,
        }));
      }
    }
  } catch {
    // no loader context
  }

  // Attribute name options: vendor catalog + locally created names (for optimistic create)
  const attributeNameOptions = useMemo(() => {
    const map = new Map<string, { label: string; value: string }>();
    for (const a of vendorAttrs) {
      const key = a.name.trim().toLowerCase();
      if (!map.has(key)) map.set(key, { label: a.name, value: a.name });
    }
    for (const a of watchedAttrs) {
      const n = String(a.name || "").trim();
      if (!n) continue;
      const k = n.toLowerCase();
      if (!map.has(k)) map.set(k, { label: n, value: n });
    }
    return Array.from(map.values()).sort((x, y) => x.label.localeCompare(y.label));
  }, [JSON.stringify(vendorAttrs), JSON.stringify(watchedAttrs.map((a) => a.name))]);

  // Disable duplicate attribute names across rows (unique per vendor)
  const usedNames = useMemo(() => {
    const m = new Map<string, number[]>();
    watchedAttrs.forEach((a, idx) => {
      const k = String(a.name || "")
        .trim()
        .toLowerCase();
      if (!k) return;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(idx);
    });
    return m;
  }, [JSON.stringify(watchedAttrs.map((a) => a.name))]);

  const attributeNameOptionsWithDisabled = (currentIndex: number) =>
    attributeNameOptions.map((opt) => {
      const lower = opt.value.toLowerCase();
      const indices = usedNames.get(lower) || [];
      const isTakenElsewhere = indices.some((i) => i !== currentIndex);
      return { ...opt, disabled: isTakenElsewhere };
    });

  const isAttributeNameTaken = (attributeName: string, currentIndex: number) => {
    const lower = attributeName.trim().toLowerCase();
    return watchedAttrs.some(
      (attribute, index) =>
        index !== currentIndex && String(attribute.name || "").trim().toLowerCase() === lower,
    );
  };

  // Build value suggestions per attribute name (filtered by selected attribute)
  const getValueSuggestions = (attrName: string, currentValues: Option[]) => {
    const key = String(attrName || "")
      .trim()
      .toLowerCase();
    const globals = globalMap[key] || [];
    // merge globals + locally typed values for this attribute across rows (dedup)
    const merged: Option[] = [...globals];
    const seen = new Set(merged.map((o) => o.value.toLowerCase()));
    for (const a of watchedAttrs) {
      if (
        String(a.name || "")
          .trim()
          .toLowerCase() !== key
      )
        continue;
      for (const v of (a.values || []) as any[]) {
        const opt = typeof v === "string" ? { label: v, value: v } : v;
        if (!opt?.value) continue;
        const lower = String(opt.value).toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          merged.push({ label: opt.label ?? opt.value, value: opt.value });
        }
      }
    }
    const currentLower = new Set(currentValues.map((v) => v.value.toLowerCase()));
    return merged.filter((o) => !currentLower.has(o.value.toLowerCase()));
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-lg">{t("sidebar.attributes")}</span>
      {fields.map((field, index) => {
        const attribute = watchedAttrs[index] || ({ name: "", values: [] } as IVariantAttributeDraft);
        return (
          <AttributeRow
            key={field.id}
            attribute={attribute}
            attributeNameLabel={index === 0 ? t("product.attributeName") : undefined}
            attributeNameOptions={attributeNameOptionsWithDisabled(index)}
            attributeValuesLabel={index === 0 ? t("product.attributeValuesHint") : undefined}
            getValueSuggestions={getValueSuggestions}
            index={index}
            isAttributeNameTaken={isAttributeNameTaken}
            onCreateAttribute={(name) => {
              const lower = name.toLowerCase();
              const exists = vendorAttrs.some((attribute) => attribute.name.trim().toLowerCase() === lower);
              if (!exists) {
                createAttrFetcher.submit(
                  { data: JSON.stringify({ name, values: [] }) },
                  { method: "POST", action: "/products/attributes/add" },
                );
              }
            }}
            onCreateValue={(attributeName, currentValues, nextValues, createdValue) => {
              const key = attributeName.trim().toLowerCase();
              const attribute = vendorAttrs.find((item) => item.name.trim().toLowerCase() === key);
              if (!attribute || nextValues.length <= currentValues.length || !createdValue) return;
              const existingLower = new Set((globalMap[key] || []).map((option) => option.value.toLowerCase()));
              const previousLower = new Set(currentValues.map((option) => option.value.toLowerCase()));
              const newValues = nextValues.filter(
                (option) => !existingLower.has(option.value.toLowerCase()) && !previousLower.has(option.value.toLowerCase()),
              );
              if (!newValues.length) return;
              globalMap[key] = [...(globalMap[key] || []), createdValue];
              submit(
                { values: createdValue.value, intent: "createValue" },
                { method: "POST", action: `/products/attributes/${attribute.id}` },
              );
            }}
            onRemove={remove}
            updateAttribute={(attributeIndex, nextAttribute) => update(attributeIndex, nextAttribute)}
          />
        );
      })}
      <div>
        <TMButton
          size="sm"
          variant="outline"
          type="button"
          onClick={() => append({ name: "", values: [] } as any)}
          className="border-dashed"
        >
          {t("product.addAttribute")}
        </TMButton>
      </div>
    </div>
  );
};

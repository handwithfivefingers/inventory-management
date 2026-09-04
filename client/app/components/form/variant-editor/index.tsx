import { useFetcher, useLoaderData, useOutletContext } from "@remix-run/react";
import { useCallback, useMemo } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { IVendorSettings } from "~/action.server/setting.service";
import { Icon } from "~/components/icon";
import { TMButton } from "~/components/tm-button";
import { TMTable } from "~/components/tm-table";
import { useTranslation } from "~/i18n";
import { CheckboxInput } from "../checkbox-input";
import { CreatableSelectInput } from "../creatable-select-input";
import { CreatableTagInput, Option } from "../creatable-tag-input";
import { NumberStepper } from "../number-stepper";
import { TextInput } from "../text-input";
import { SelectInput } from "../select-input";
import { useSubmitPromise } from "~/hooks";

export type AttributeValueOption = Option;

export interface IVariantAttributeDraft {
  id?: number | string;
  name: string;
  values: AttributeValueOption[];
}

export interface IVariantDraft {
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

const normalizeValues = (raw: any): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw))
    return raw
      .map((v: any) => (typeof v === "string" ? v : v?.value ?? v?.label ?? ""))
      .map((s: string) => String(s).trim())
      .filter(Boolean);
  if (typeof raw === "object") {
    // Option object single?
    if ((raw as any).value) return [String((raw as any).value).trim()].filter(Boolean);
  }
  return String(raw)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
};

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

type MoneyKey = "costPrice" | "regularPrice" | "salePrice" | "wholeSalePrice";

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
          values: Array.isArray(a?.values)
            ? (a.values as AttributeValueOption[])
                .map((o) => (typeof o === "string" ? String(o) : o.value))
                .filter(Boolean)
            : [],
        }))
        .filter((a) => a.name && a.values.length > 0),
    [JSON.stringify(watchedAttrs)],
  );

  const optionKeyOf = (options: Record<string, string> | undefined) =>
    Object.entries(options || {})
      .filter(([, v]) => String(v ?? "").trim() !== "")
      .map(([k, v]) => `${k}:${String(v).trim().toLowerCase()}`)
      .sort()
      .join("|");

  const existingKeys = useMemo(
    () => new Set(watchedVariants.map((v) => optionKeyOf(v.options))),
    [JSON.stringify(watchedVariants.map((v) => v.options))],
  );

  const generateVariant = useCallback(() => {
    if (!usableAttrs.length) return;
    const current = form.getValues("variants") || [];
    const currentKeys = new Set(current.map((v: any) => optionKeyOf(v?.options)));
    const fresh = buildCombos(usableAttrs as any)
      .filter((options) => !currentKeys.has(optionKeyOf(options)))
      .map((options) => ({ options, quantity: "", isNegative: false }));
    if (!fresh.length) return;
    form.setValue("variants", [...current, ...fresh] as any);
  }, [JSON.stringify(usableAttrs)]);

  const addNewVariant = () => append({ options: {}, quantity: "", isNegative: false });

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

  const columns = [
    {
      title: t("product.variant"),
      dataIndex: "options",
      render: (r: any) => {
        const rowIdx: number = r.index;
        const rowOptions: Record<string, string> = watchedVariants[rowIdx]?.options || {};
        if (usableAttrs.length === 0) {
          if (Object.keys(rowOptions).length === 0)
            return <span className="text-slate-400 text-xs">{t("product.newVariant")}</span>;
          return <span className="text-xs">{JSON.stringify(rowOptions)}</span>;
        }
        return (
          <div className="flex flex-col gap-1 min-w-[220px]">
            {usableAttrs.map((a) => {
              const opts = a.values.map((v) => ({ label: v, value: v }));
              const val = rowOptions[a.name] ?? "";
              return (
                <div key={a.name} className="flex items-center gap-1">
                  <span className="text-xs text-slate-500 w-16 shrink-0 truncate">{a.name}:</span>
                  <div className="flex-1 min-w-[120px]">
                    <SelectInput
                      value={val}
                      options={opts.map((o) => ({ ...o, disabled: isOptionDisabled(a.name, o.value, rowIdx) }))}
                      placeholder="---"
                      inputSize="xs"
                      onSelect={(v: any) => {
                        const next = { ...(rowOptions || {}) };
                        if (!v) delete next[a.name];
                        else next[a.name] = String(v);
                        form.setValue(`variants.${rowIdx}.options`, next as any);
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        );
      },
      className: "w-64",
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
    ...(["costPrice", "regularPrice", "salePrice", "wholeSalePrice"] as MoneyKey[]).map((key) => ({
      title:
        key === "costPrice" ? (
          <Label required>{t("product.costPrice")}</Label>
        ) : key === "regularPrice" ? (
          <Label required>{t("product.regularPrice")}</Label>
        ) : key === "salePrice" ? (
          <Label required>{t("product.salePrice")}</Label>
        ) : (
          <Label required>{t("product.wholeSalePrice")}</Label>
        ),
      dataIndex: key,
      render: (r: any) => (
        <NumberStepper
          value={form.watch(`variants.${r.index}.${key}`)}
          step={moneyStep}
          onValueChange={(v) => form.setValue(`variants.${r.index}.${key}`, v.value as any)}
        />
      ),
      className: "w-60",
    })),
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
          columns={columns as any}
          data={variantFields.map((_, index) => ({
            index,
            options: watchedVariants[index]?.options || {},
          }))}
          rowKey="index"
        />
      )}

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
  const watchedAttrs: IVariantAttributeDraft[] = useWatch({ control: form.control, name: "variantAttributes" }) || [];
  const createAttrFetcher = useFetcher();
  const createValueFetcher = useFetcher();
  const { submit, isLoading } = useSubmitPromise();

  // Vendor-global attribute catalog: unique per vendor (Size {sm,md,lg}, Color {red,green})
  let vendorAttrs: { id: number | string; name: string; values: { id: number | string; value: string }[] }[] = [];
  let globalMap: Record<string, Option[]> = {};
  try {
    const loaderData: any = useLoaderData();
    const globalAttrs: any[] =
      loaderData?.suggestedAttributes || loaderData?.attributesData || loaderData?.data?.attributes || [];
    if (Array.isArray(globalAttrs)) {
      // already deduped per vendor in backend listAttributes
      vendorAttrs = globalAttrs
        .map((g: any) => ({
          id: g.id,
          name: String(g.name || "").trim(),
          values: (g.values || [])
            .map((v: any) => ({ id: v.id, value: String(v.value ?? v.label ?? "").trim() }))
            .filter((v: any) => v.value),
        }))
        .filter((a: any) => a.name);
      for (const g of vendorAttrs) {
        const key = g.name.trim().toLowerCase();
        if (!key) continue;
        globalMap[key] = g.values.map((v) => ({ label: v.value, value: v.value }));
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
        const currentName = String((watchedAttrs[index] as any)?.name || "").trim();
        const value = (form.watch(`variantAttributes.${index}.values`) as AttributeValueOption[]) || [];
        const normalizedValue: AttributeValueOption[] = Array.isArray(value)
          ? (value as any[])
              .map((v: any) => (typeof v === "string" ? { label: v, value: v } : v))
              .filter((v: any) => v?.value)
          : [];
        const suggestions = getValueSuggestions(currentName, normalizedValue);
        return (
          <div key={field.id} className="flex gap-2 items-end">
            <div className="w-56">
              <CreatableSelectInput
                label={index === 0 ? t("product.attributeName") : undefined}
                value={currentName || undefined}
                options={attributeNameOptionsWithDisabled(index)}
                placeholder="Chọn hoặc tạo thuộc tính"
                onSelect={(val) => {
                  // prevent duplicate names (unique per vendor)
                  const lower = val.toLowerCase();
                  const duplicate = watchedAttrs.some(
                    (a, i) =>
                      i !== index &&
                      String(a.name || "")
                        .trim()
                        .toLowerCase() === lower,
                  );
                  if (duplicate) return;
                  form.setValue(`variantAttributes.${index}.name` as const, val as any, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
                onCreate={(input) => {
                  const lower = input.trim().toLowerCase();
                  if (
                    watchedAttrs.some(
                      (a, i) =>
                        i !== index &&
                        String(a.name || "")
                          .trim()
                          .toLowerCase() === lower,
                    )
                  )
                    return;
                  const trimmed = input.trim();
                  form.setValue(`variantAttributes.${index}.name` as const, trimmed as any, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  // Persist vendor-global attribute instantly
                  const exists = vendorAttrs.some((a) => a.name.trim().toLowerCase() === lower);
                  if (!exists && trimmed) {
                    createAttrFetcher.submit(
                      { data: JSON.stringify({ name: trimmed, values: [] }) },
                      { method: "POST", action: "/products/attributes/add" },
                    );
                  }
                }}
              />
            </div>
            <div className="flex-1">
              <CreatableTagInput
                label={index === 0 ? t("product.attributeValuesHint") : undefined}
                value={normalizedValue}
                options={suggestions}
                onChange={(next) => {
                  form.setValue(`variantAttributes.${index}.values` as const, next as any, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  // Persist new values instantly for existing vendor attribute
                  const key = currentName.trim().toLowerCase();
                  const attr = vendorAttrs.find((a) => a.name.trim().toLowerCase() === key);
                  if (attr && next.length > normalizedValue.length) {
                    const existingLower = new Set((globalMap[key] || []).map((o) => o.value.toLowerCase()));
                    const prevLower = new Set(normalizedValue.map((v) => v.value.toLowerCase()));
                    const toCreate = next.filter(
                      (o) => !existingLower.has(o.value.toLowerCase()) && !prevLower.has(o.value.toLowerCase()),
                    );
                    if (toCreate.length) {
                      // createValueFetcher.submit(
                      //   { values: JSON.stringify(toCreate.map((o) => o.value)), _action: "createValues" },
                      //   { method: "POST", action: `/products/attributes/${attr.id}` },
                      // );
                      submit(
                        { values: JSON.stringify(toCreate.map((o) => o.value)), intent: "createValues" },
                        { method: "POST", action: `/products/attributes/${attr.id}` },
                      );
                    }
                  }
                }}
                placeholder={currentName ? `Giá trị cho ${currentName} — Enter để tạo` : "Chọn thuộc tính trước"}
              />
            </div>
            <TMButton
              size="xs"
              onClick={() => remove(index)}
              className="py-2 px-2 mb-0.5 bg-danger/10 text-danger hover:bg-danger/20"
            >
              <Icon name="trash-2" fontSize={14} />
            </TMButton>
          </div>
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

const Label = ({ children, required = false }: { children: React.ReactNode; required?: boolean }) => {
  return (
    <div className="flex gap-1">
      {children}
      {required && <span className="text-danger">*</span>}{" "}
    </div>
  );
};

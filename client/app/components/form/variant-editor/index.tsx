import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { TMButton } from "~/components/tm-button";
import { ProductSchemaType } from "~/constants/schema/product";
import { useTranslation } from "~/i18n";
import { AttributeVariant } from "./attribute";
import { SimpleProductEditor } from "./simple-product";
import type { AttributeValueOption, IVariantAttributeDraft, IVariantDraft, VariantEditorProps } from "./types";
import { buildCombos, optionKeyOf } from "./utils";
import { VariantMasterGrid } from "./variant-master-grid";

export type {
  AttributeValueOption,
  BarcodeManagerProps,
  IVariantAttributeDraft,
  IVariantDraft,
  VariantEditorProps,
} from "./types";
export { buildCombos, filterVariantOptionsByAttributes } from "./utils";

const getUsableAttributes = (attributes: IVariantAttributeDraft[]) => {
  return attributes
    .map((attribute) => ({
      name: (attribute?.name || "").trim(),
      values: Array.isArray(attribute?.values)
        ? (attribute.values as AttributeValueOption[])
            .map((option) => (typeof option === "string" ? option : option.value))
            .filter(Boolean)
        : [],
    }))
    .filter((attribute) => attribute.name && attribute.values.length > 0);
};

export const VariantEditor = ({ seed, units = [], type }: VariantEditorProps = { type: 0 }) => {
  const form = useFormContext<ProductSchemaType>();
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "variants" });
  const attributes = (useWatch({ control: form.control, name: "variantAttributes" }) || []) as IVariantAttributeDraft[];
  const variants = (useWatch({ control: form.control, name: "variants" }) || []) as IVariantDraft[];
  const usable = getUsableAttributes(attributes);

  const generate = () => {
    if (!usable.length) return;
    const existing = new Set(variants.map((variant) => optionKeyOf(variant.options)));
    const additions = buildCombos(usable)
      .filter((options) => !existing.has(optionKeyOf(options)))
      .map((options) => ({
        ...(seed || { quantity: 0, isNegative: false, barcodes: [] }),
        options,
      }));
    if (additions.length) {
      form.setValue("type", 1, { shouldDirty: true });
      additions.forEach((variant) => append(variant as any));
    }
  };
  const add = () => {
    form.setValue("type", 1, { shouldDirty: true });
    append({
      ...(seed || {}),
      options: {},
      quantity: seed?.quantity ?? 0,
      isNegative: seed?.isNegative ?? false,
      barcodes: seed?.barcodes || [],
    } as any);
  };
  return (
    <div className="flex h-full flex-col gap-3">
      {type === 0 && <SimpleProductEditor units={units} />}

      {type === 1 && (
        <>
          <AttributeVariant />
          <div className="flex justify-end gap-2">
            <TMButton type="button" size="sm" variant="outline" disabled={!usable.length} onClick={generate}>
              {t("product.generateAllVariants")}
            </TMButton>
            <TMButton type="button" size="sm" onClick={add}>
              {t("product.addVariant")}
            </TMButton>
          </div>
          <VariantMasterGrid units={units} attributes={attributes} fields={fields} remove={remove} />
        </>
      )}
    </div>
  );
};

import { forwardRef, useEffect, useImperativeHandle, useMemo } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Icon } from "~/components/icon";
import { PermissionGuard } from "~/components/permission-guard";
import { TMButton } from "~/components/tm-button";
import { MODULE_ENUM } from "~/constants/modules";
import { ProductSchemaType } from "~/constants/schema/product";
import { useTranslation } from "~/i18n";
import { FormControl } from "../form-control";
import { NumberInput } from "../number-input";
import { SelectInput } from "../select-input";
import { SwitchInput } from "../switch-input";
import { TextInput } from "../text-input";
type Unit = { id: number | string; name: string; isDefault?: boolean };
interface Props {
  variantName: `variants.${number}`;
  units: Unit[];
}

export const getBarcodeUnitOptions = (units: Unit[], selectedUnitIds: Set<string>, currentUnitId: unknown) =>
  units
    .filter((unit) => String(unit.id) === String(currentUnitId) || !selectedUnitIds.has(String(unit.id)))
    .map((unit) => ({ label: unit.name, value: unit.id }));

export type BarcodeFormRef = {
  append: (v: any) => void;
  move: (...args: any) => void;
  remove: (v: any) => void;
};
export const BarcodeEditor = forwardRef<BarcodeFormRef, Props>(({ variantName, units }, ref) => {
  const barcodesDefinition = `${variantName}.barcodes` as const;
  const form = useFormContext<ProductSchemaType>();
  const { append, fields, move, remove } = useFieldArray({
    control: form.control,
    name: barcodesDefinition,
  });
  const { t } = useTranslation();
  const barcodeRows = useWatch({ control: form.control, name: barcodesDefinition }) || [];
  const hasBaseBarcode = barcodeRows.some((row) => Number(row?.conversionRate) === 1);
  const selectedUnitIds = useMemo(
    () =>
      new Set(
        barcodeRows
          .map((row) => row?.unitId)
          .filter((unitId) => unitId != null)
          .map(String),
      ),
    [barcodeRows],
  );
  //   const availableUnits = useMemo(
  //     () => units.filter((unit) => !selectedUnitIds.has(String(unit.id))),
  //     [selectedUnitIds, units],
  //   );
  const removeBarcode = (index: number) => {
    if (index > 0) remove(index);
  };
  useImperativeHandle(
    ref,
    () => ({
      append,
      move,
      remove,
    }),
    [variantName, units, barcodeRows],
  );

  return (
    <div className="flex col-span-12 w-full flex-col">
      {fields.map((fieldControl, fieldIndex) => {
        const selectedUnitId = barcodeRows[fieldIndex]?.unitId;
        const isBaseBarcode = fieldIndex === 0;
        const unitOptions = getBarcodeUnitOptions(units, selectedUnitIds, selectedUnitId);

        return (
          <div
            className="col-span-12 w-full grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7"
            key={fieldControl.id}
          >
            <FormControl name={`${barcodesDefinition}.${fieldIndex}.barcode`}>
              {(field) => (
                <TextInput
                  label={t("product.barcode", { defaultValue: "Mã vạch" })}
                  {...field}
                  value={field.value ?? ""}
                />
              )}
            </FormControl>
            <FormControl name={`${barcodesDefinition}.${fieldIndex}.unitId`}>
              {(field) => (
                <SelectInput
                  disabled={isBaseBarcode && hasBaseBarcode}
                  label={t("product.unit", { defaultValue: "Đơn vị" })}
                  options={unitOptions}
                  onSelect={field.onChange}
                  value={field.value}
                />
              )}
            </FormControl>
            <FormControl name={`${barcodesDefinition}.${fieldIndex}.conversionRate`}>
              {(field) => (
                <NumberInput
                  disabled={isBaseBarcode && hasBaseBarcode}
                  label={t("product.conversionRate", { defaultValue: "Tỷ lệ quy đổi" })}
                  {...field}
                  value={field.value as any}
                  onValueChange={(value) => field.onChange(value.value)}
                />
              )}
            </FormControl>
            <FormControl name={`${barcodesDefinition}.${fieldIndex}.costPrice`}>
              {(field) => (
                <NumberInput
                  label={t("product.costPrice")}
                  {...field}
                  value={field.value as any}
                  onValueChange={(value) => field.onChange(value.value)}
                />
              )}
            </FormControl>
            <FormControl name={`${barcodesDefinition}.${fieldIndex}.retailPrice`}>
              {(field) => (
                <NumberInput
                  label={t("product.retailPrice")}
                  {...field}
                  value={field.value as any}
                  onValueChange={(value) => field.onChange(value.value)}
                />
              )}
            </FormControl>
            <FormControl name={`${barcodesDefinition}.${fieldIndex}.wholesalePrice`}>
              {(field) => (
                <NumberInput
                  label={t("product.wholesalePrice")}
                  {...field}
                  value={field.value as any}
                  onValueChange={(value) => field.onChange(value.value)}
                />
              )}
            </FormControl>
            <div className="flex items-end">
              {!isBaseBarcode && (
                <PermissionGuard permission="UPDATE" module={MODULE_ENUM.product}>
                  <TMButton
                    type="button"
                    className="w-full"
                    size="sm"
                    variant="outline"
                    onClick={() => removeBarcode(fieldIndex)}
                  >
                    {t("common.remove", { defaultValue: "Xóa" })}
                  </TMButton>
                </PermissionGuard>
              )}
            </div>
            {isBaseBarcode && !hasBaseBarcode && (
              <p className="col-span-full text-sm text-danger">
                {t("product.missingBaseBarcode", {
                  defaultValue: "Cần một mã vạch đơn vị gốc có tỷ lệ quy đổi bằng 1",
                })}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
});

import { useMemo, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Icon } from "~/components/icon";
import { PermissionGuard } from "~/components/permission-guard";
import { TMButton } from "~/components/tm-button";
import { MODULE_ENUM } from "~/constants/modules";
import { ProductSchemaType } from "~/constants/schema/product";
import { useTranslation } from "~/i18n";
import { FormControl } from "../form-control";
import { NumberInput } from "../number-input";
import { SwitchInput } from "../switch-input";
import { TextInput } from "../text-input";
import { BarcodeEditor, BarcodeFormRef } from "./barcodeEditor";

type Unit = { id: number | string; name: string; isDefault?: boolean };

interface Props {
  units: Unit[];
}

const createBarcodeRow = (unitId: number | string | null, conversionRate: number) => ({
  barcode: null,
  unitId,
  conversionRate,
  costPrice: 0,
  retailPrice: 0,
  wholesalePrice: 0,
});

export const getBarcodeUnitOptions = (units: Unit[], selectedUnitIds: Set<string>, currentUnitId: unknown) =>
  units
    .filter((unit) => String(unit.id) === String(currentUnitId) || !selectedUnitIds.has(String(unit.id)))
    .map((unit) => ({ label: unit.name, value: unit.id }));

export const SimpleProductEditor = ({ units }: Props) => {
  const nameDefinition = "variants.0";
  const barcodesDefinition = `${nameDefinition}.barcodes` as const;
  const form = useFormContext<ProductSchemaType>();

  const barcodeFormRef = useRef<BarcodeFormRef>(null);
  const barcodeRows = useWatch({ control: form.control, name: barcodesDefinition }) || [];
  const { t } = useTranslation();
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
  const availableUnits = useMemo(
    () => units.filter((unit) => !selectedUnitIds.has(String(unit.id))),
    [selectedUnitIds, units],
  );

  const addBarcode = () => {
    console.log(`barcodeFormRef.current`, barcodeFormRef.current);
    const highestConversionRate = Math.max(1, ...barcodeRows.map((row) => Number(row?.conversionRate) || 0));
    barcodeFormRef.current?.append(
      createBarcodeRow(availableUnits[0]?.id ?? null, Math.max(2, highestConversionRate + 1)),
    );
  };

  return (
    <div className="grid grid-cols-4 col-span-12 border rounded-md p-4 border-primary/30 gap-2 bg-white shadow-xl shadow-slate-300/10">
      <div className="col-span-12 pb-2 border-b border-primary flex items-center gap-2 text-sm font-medium text-primary">
        <Icon name="dollar-sign" fontSize={16} className="text-primary" />
        {t("product.pricingAndTax", { defaultValue: "Giá cả & Thuế phí / Pricing & Tax" })}
      </div>
      <div className="col-span-12 w-full grid grid-cols-5 gap-2 items-end">
        <FormControl name={`${nameDefinition}.skuCode`}>
          <TextInput
            label={t("product.sku")}
            placeholder={t("product.autoGenerateSku", { defaultValue: "Để trống để tự sinh" })}
          />
        </FormControl>
        <FormControl name={`${nameDefinition}.VAT`}>
          {(field) => (
            <NumberInput
              label={t("product.VAT")}
              {...field}
              value={field.value as any}
              onValueChange={(value) => field.onChange(value.value)}
            />
          )}
        </FormControl>
        <FormControl name={`${nameDefinition}.isNegative`}>
          {(field) => (
            <SwitchInput
              label={t("product.allowNegativeStock", { defaultValue: "Cho phép âm kho" })}
              checked={field.value}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                field.onChange(event.target.checked, { shouldDirty: true })
              }
            />
          )}
        </FormControl>
      </div>

      <BarcodeEditor units={units} variantName={nameDefinition} ref={barcodeFormRef} />

      <div className="col-span-12 flex justify-end">
        <PermissionGuard permission="UPDATE" module={MODULE_ENUM.product}>
          <TMButton
            type="button"
            size="sm"
            variant="outline"
            disabled={availableUnits.length === 0}
            onClick={addBarcode}
          >
            {t("product.addBarcode", { defaultValue: "Thêm mã vạch" })}
          </TMButton>
        </PermissionGuard>
      </div>
    </div>
  );
};

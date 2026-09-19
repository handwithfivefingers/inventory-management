import { useMemo, useRef, useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { MODULE_ENUM } from "~/constants/modules";
import type { ProductSchemaType } from "~/constants/schema/product";
import { useTranslation } from "~/i18n";
import { getConvertedStock } from "~/libs/product-unit";
import { PermissionGuard } from "~/components/permission-guard";
import { TMButton } from "~/components/tm-button";
import { TMModal } from "~/components/tm-modal";
import { FormControl } from "../form-control";
import { NumberStepper } from "../number-stepper";
import { SelectInput } from "../select-input";
import { TextInput } from "../text-input";
import { SwitchInput } from "../switch-input";
import { BarcodeEditor, BarcodeFormRef } from "./barcodeEditor";

type Unit = { id: number | string; name: string; isDefault?: boolean };

export function PricingUnitDrawer({
  index,
  units,
  trigger,
}: {
  index: number;
  units: Unit[];
  trigger: React.ReactNode;
}) {
  const { t } = useTranslation();
  const form = useFormContext<ProductSchemaType>();
  const [open, setOpen] = useState(false);
  const barcodeFormRef = useRef<BarcodeFormRef>(null);
  const name = `variants.${index}.barcodes` as const;
  // const variantName = `variants.${index as number}`;
  const nameDefinition = `variants.${index}` as `variants.${number}`;
  // const { fields, append, remove } = useFieldArray({ control: form.control, name });
  const rows = useWatch({ control: form.control, name }) || [];
  const baseQuantity = Number(form.getValues(`variants.${index}.quantity` as const) || 0);
  const baseExists = useMemo(() => rows.some((row: any) => Number(row?.conversionRate) === 1), [rows]);

  const defaultUnitId = units.find((unit) => unit.isDefault)?.id ?? null;
  const selectedUnitIds = useMemo(
    () =>
      new Set(
        rows
          .map((row: any) => row?.unitId)
          .filter((unitId: unknown) => unitId != null)
          .map(String),
      ),
    [rows],
  );
  const nextUnitId = units.find((unit) => !selectedUnitIds.has(String(unit.id)))?.id ?? null;

  const addRow = () =>
    barcodeFormRef.current?.append({
      barcode: null,
      unitId: nextUnitId,
      conversionRate: 2,
      costPrice: 0,
      retailPrice: 0,
      wholesalePrice: 0,
    });

  const openDrawer = () => {
    if (!rows.length)
      barcodeFormRef.current?.append({
        barcode: null,
        unitId: defaultUnitId,
        conversionRate: 1,
        costPrice: 0,
        retailPrice: 0,
        wholesalePrice: 0,
      });
    setOpen(true);
  };
  return (
    <>
      <PermissionGuard
        permission="UPDATE"
        module={MODULE_ENUM.product}
        fallback={
          <TMButton
            type="button"
            size="xs"
            variant="outline"
            disabled
            title={t("common.noPermission", { defaultValue: "Bạn không có quyền chỉnh sửa" })}
          >
            {trigger}
          </TMButton>
        }
      >
        <TMButton type="button" size="xs" variant="outline" onClick={openDrawer}>
          {trigger}
        </TMButton>
      </PermissionGuard>
      <TMModal
        open={open}
        close={() => setOpen(false)}
        width={980}
        title={t("product.pricingUnits", { defaultValue: "Giá & đơn vị" })}
      >
        <div className="max-h-[65svh] overflow-auto space-y-3 p-1">
          <BarcodeEditor variantName={nameDefinition} units={units} ref={barcodeFormRef} />
          {/* {fields.map((field, rowIndex) => {
            const row: any = rows[rowIndex] || {};
            const isBase = Number(row.conversionRate) === 1;
            const stock = getConvertedStock(baseQuantity, Number(row.conversionRate));
            return (
              <div
                key={field.id}
                className="rounded border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40"
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <FormControl name={`${name}.${rowIndex}.unitId`}>
                    {(input) => (
                      <PermissionGuard
                        permission="UPDATE"
                        module={MODULE_ENUM.product}
                        fallback={
                          <SelectInput
                            disabled
                            label={t("product.unit", { defaultValue: "Đơn vị" })}
                            value={input.value}
                            options={units
                              .filter(
                                (unit) =>
                                  String(unit.id) === String(input.value) || !selectedUnitIds.has(String(unit.id)),
                              )
                              .map((unit) => ({ label: unit.name, value: unit.id }))}
                            onSelect={input.onChange}
                          />
                        }
                      >
                        <SelectInput
                          label={t("product.unit", { defaultValue: "Đơn vị" })}
                          value={input.value}
                          disabled={isBase}
                          options={units
                            .filter(
                              (unit) =>
                                String(unit.id) === String(input.value) || !selectedUnitIds.has(String(unit.id)),
                            )
                            .map((unit) => ({ label: unit.name, value: unit.id }))}
                          onSelect={input.onChange}
                        />
                      </PermissionGuard>
                    )}
                  </FormControl>
                  <FormControl name={`${name}.${rowIndex}.barcode`}>
                    {(input) => (
                      <PermissionGuard
                        permission="UPDATE"
                        module={MODULE_ENUM.product}
                        fallback={
                          <TextInput
                            disabled
                            label={t("product.barcode", { defaultValue: "Mã vạch" })}
                            {...input}
                            value={input.value ?? ""}
                          />
                        }
                      >
                        <TextInput
                          label={t("product.barcode", { defaultValue: "Mã vạch" })}
                          {...input}
                          value={input.value ?? ""}
                        />
                      </PermissionGuard>
                    )}
                  </FormControl>
                  <FormControl name={`${name}.${rowIndex}.conversionRate`}>
                    {(input) => (
                      <PermissionGuard
                        permission="UPDATE"
                        module={MODULE_ENUM.product}
                        fallback={
                          <NumberStepper
                            label={t("product.conversionRate", { defaultValue: "Tỷ lệ quy đổi" })}
                            value={input.value}
                            disabled
                            onValueChange={(value) => input.onChange(value.value)}
                          />
                        }
                      >
                        <NumberStepper
                          label={t("product.conversionRate", { defaultValue: "Tỷ lệ quy đổi" })}
                          value={input.value}
                          disabled={isBase}
                          onValueChange={(value) => input.onChange(value.value)}
                        />
                      </PermissionGuard>
                    )}
                  </FormControl>
                  <div className="text-sm self-end pb-2 text-slate-600 dark:text-slate-300">
                    {isBase
                      ? t("product.baseUnit", { defaultValue: "Đơn vị gốc" })
                      : `${stock.quantity} + ${stock.remainder}`}
                  </div>
                  <FormControl name={`${name}.${rowIndex}.costPrice`}>
                    <PermissionGuard
                      permission="UPDATE"
                      module={MODULE_ENUM.product}
                      fallback={
                        <NumberStepper
                          disabled
                          label={t("product.costPrice", { defaultValue: "Giá vốn" })}
                          value={row.costPrice}
                          onValueChange={() => undefined}
                        />
                      }
                    >
                      <NumberStepper
                        label={t("product.costPrice", { defaultValue: "Giá vốn" })}
                        value={row.costPrice}
                        onValueChange={(value) =>
                          form.setValue(`${name}.${rowIndex}.costPrice`, value.value, {
                            shouldValidate: true,
                            shouldDirty: true,
                          })
                        }
                      />
                    </PermissionGuard>
                  </FormControl>
                  <FormControl name={`${name}.${rowIndex}.retailPrice`}>
                    <PermissionGuard
                      permission="UPDATE"
                      module={MODULE_ENUM.product}
                      fallback={
                        <NumberStepper
                          disabled
                          label={t("product.retailPrice", { defaultValue: "Giá lẻ" })}
                          value={row.retailPrice}
                          onValueChange={() => undefined}
                        />
                      }
                    >
                      <NumberStepper
                        label={t("product.retailPrice", { defaultValue: "Giá lẻ" })}
                        value={row.retailPrice}
                        onValueChange={(value) =>
                          form.setValue(`${name}.${rowIndex}.retailPrice`, value.value, {
                            shouldValidate: true,
                            shouldDirty: true,
                          })
                        }
                      />
                    </PermissionGuard>
                  </FormControl>
                  <FormControl name={`${name}.${rowIndex}.wholesalePrice`}>
                    <PermissionGuard
                      permission="UPDATE"
                      module={MODULE_ENUM.product}
                      fallback={
                        <NumberStepper
                          disabled
                          label={t("product.wholesalePrice", { defaultValue: "Giá sỉ" })}
                          value={row.wholesalePrice}
                          onValueChange={() => undefined}
                        />
                      }
                    >
                      <NumberStepper
                        label={t("product.wholesalePrice", { defaultValue: "Giá sỉ" })}
                        value={row.wholesalePrice}
                        onValueChange={(value) =>
                          form.setValue(`${name}.${rowIndex}.wholesalePrice`, value.value, {
                            shouldValidate: true,
                            shouldDirty: true,
                          })
                        }
                      />
                    </PermissionGuard>
                  </FormControl>
                  <div className="flex items-end">
                    <PermissionGuard permission="UPDATE" module={MODULE_ENUM.product}>
                      <TMButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isBase || fields.length === 1}
                        onClick={() => remove(rowIndex)}
                      >
                        {t("common.delete")}
                      </TMButton>
                    </PermissionGuard>
                  </div>
                </div>
              </div>
            );
          })} */}
          {!baseExists && (
            <p className="text-sm text-red-600">
              {t("product.baseUnitRequired", { defaultValue: "Cần đúng một dòng đơn vị gốc với tỷ lệ 1." })}
            </p>
          )}
          <PermissionGuard permission="UPDATE" module={MODULE_ENUM.product}>
            <SwitchInput
              label={t("product.allowNegativeStock", { defaultValue: "Cho phép âm kho" })}
              checked={Boolean(form.getValues(`variants.${index}.isNegative` as const))}
              onChange={(event: any) =>
                form.setValue(`variants.${index}.isNegative`, event.target.checked, { shouldDirty: true })
              }
            />
          </PermissionGuard>
          <PermissionGuard permission="UPDATE" module={MODULE_ENUM.product}>
            <TMButton type="button" size="sm" disabled={nextUnitId == null} onClick={addRow}>
              {t("product.addConversion", { defaultValue: "Thêm quy cách" })}
            </TMButton>
          </PermissionGuard>
        </div>
      </TMModal>
    </>
  );
}

import { useFieldArray, useFormContext } from "react-hook-form";
import { Icon } from "~/components/icon";
import { ProductSchemaType } from "~/constants/schema/product";
import { FormControl } from "../form-control";
import { NumberInput } from "../number-input";
import { useTranslation } from "~/i18n";
import { SelectInput } from "../select-input";
import { SwitchInput } from "../switch-input";
import { TextInput } from "../text-input";
type Unit = { id: number | string; name: string };

interface Props {
  units: Unit[];
}
export const SimpleProductEditor = ({ units }: Props) => {
  const nameDefinition = `variants.0`;
  const barcodesDefinition = `${nameDefinition}.barcodes`;
  const form = useFormContext<ProductSchemaType>();
  const defaultVariants = form.watch(nameDefinition);
  const { fields } = useFieldArray({
    control: form.control,
    name: barcodesDefinition,
  });
  const { t } = useTranslation();
  console.log(`defaultVariants`, defaultVariants);
  return (
    <div className="grid grid-cols-4 col-span-12 border rounded-md p-4 border-primary/30 gap-2 bg-white shadow-xl shadow-slate-300/10">
      <div className="col-span-12 pb-2 border-b border-primary flex items-center gap-2 text-sm font-medium text-primary">
        <Icon name="dollar-sign" fontSize={16} className="text-primary" />
        Giá cả & Thuế phí / Pricing & Tax
      </div>
      <div className="col-span-12 w-full grid grid-cols-5 gap-2 items-end">
        <FormControl name={`${nameDefinition}.skuCode`}>
          <TextInput label={t("product.sku")} placeholder="Để trống để tự sinh" />
        </FormControl>
        <FormControl name={`${nameDefinition}.VAT`}>
          {(field) => {
            return (
              <NumberInput
                label={t("product.VAT")}
                {...field}
                value={field.value as any}
                onValueChange={(v) => field.onChange(v.value)}
              />
            );
          }}
        </FormControl>{" "}
        <FormControl name={`${nameDefinition}.isNegative`}>
          {(f) => (
            <SwitchInput
              label={t("product.allowNegativeStock", { defaultValue: "Cho phép âm kho" })}
              checked={f.value}
              onChange={(event: any) => f.onChange(event.target.checked, { shouldDirty: true })}
            />
          )}
        </FormControl>
      </div>
      {fields?.map((fieldControl, fieldIndex) => {
        return (
          <div className="col-span-12 w-full grid grid-cols-5 gap-2" key={fieldControl.id}>
            <FormControl name={`${barcodesDefinition}.${fieldIndex}.costPrice`}>
              {(field) => {
                return (
                  <NumberInput
                    label={t("product.costPrice")}
                    {...field}
                    value={field.value as any}
                    onValueChange={(v) => field.onChange(v.value)}
                  />
                );
              }}
            </FormControl>

            <FormControl name={`${barcodesDefinition}.${fieldIndex}.retailPrice`}>
              {(field) => {
                return (
                  <NumberInput
                    label={t("product.retailPrice")}
                    {...field}
                    value={field.value as any}
                    onValueChange={(v) => field.onChange(v.value)}
                  />
                );
              }}
            </FormControl>

            <FormControl name={`${barcodesDefinition}.${fieldIndex}.wholesalePrice`}>
              {(field) => {
                return (
                  <NumberInput
                    label={t("product.wholesalePrice")}
                    {...field}
                    value={field.value as any}
                    onValueChange={(v) => field.onChange(v.value)}
                  />
                );
              }}
            </FormControl>

            <FormControl name={`${barcodesDefinition}.${fieldIndex}.unitId`}>
              {(f) => (
                <SelectInput
                  disabled
                  label={t("product.unit", { defaultValue: "Đơn vị" })}
                  options={units.map((unit) => ({ label: unit.name, value: unit.id }))}
                  onSelect={f.onChange}
                  value={f.value}
                />
              )}
            </FormControl>
          </div>
        );
      })}

      {/* 
      <FormControl name={`${nameDefinition}.`}>
        {(field) => {
          return (
            <NumberInput
              label={t("product.costPrice")}
              {...field}
              value={field.value as any}
              onValueChange={(v) => field.onChange(v.value)}
            />
          );
        }}
      </FormControl>
      <FormControl name="regularPrice">
        {(field) => {
          return (
            <NumberInput
              label={t("product.regularPrice")}
              {...field}
              value={field.value as any}
              onValueChange={(v) => field.onChange(v.value)}
            />
          );
        }}
      </FormControl>
      <FormControl name="salePrice">
        {(field) => {
          return (
            <NumberInput
              label={t("product.salePrice")}
              {...field}
              value={field.value as any}
              onValueChange={(v) => field.onChange(v.value)}
            />
          );
        }}
      </FormControl>
      <FormControl name="VAT">
        {(field) => {
          return (
            <NumberInput
              label="VAT(%)"
              {...field}
              value={field.value as any}
              onValueChange={(v) => {
                field.onChange(v.value);
              }}
            />
          );
        }}
      </FormControl>
      <FormControl name="VAT">
        {(field) => {
          return (
            <NumberInput
              label="VAT(%)"
              {...field}
              value={field.value as any}
              onValueChange={(v) => {
                field.onChange(v.value);
              }}
            />
          );
        }}
      </FormControl> */}
    </div>
  );
};

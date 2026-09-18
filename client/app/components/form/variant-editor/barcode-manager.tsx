import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { TMButton } from "~/components/tm-button";
import { TMModal } from "~/components/tm-modal";
import { ProductSchemaType } from "~/constants/schema/product";
import { FormControl } from "../form-control";
import { NumberStepper } from "../number-stepper";
import { SelectInput } from "../select-input";
import { TextInput } from "../text-input";
import type { BarcodeManagerProps } from "./types";

export const BarcodeManager = ({ index, units }: BarcodeManagerProps) => {
  const form = useFormContext<ProductSchemaType>();
  const [isOpen, setOpen] = useState(false);
  const barcodeName = `variants.${index}.barcodes` as const;
  const { fields: fieldArrays, append } = useFieldArray({
    control: form.control,
    name: barcodeName,
  });
  const open = () => {
    if (!form.getValues(barcodeName)?.[0]) {
      form.setValue(
        barcodeName,
        [
          {
            barcode: null,
            unitId: units[0]?.id ?? null,
            conversionRate: 1,
            costPrice: 0,
            retailPrice: 0,
            wholesalePrice: 0,
            promoPrice: null,
          },
        ],
        { shouldDirty: true },
      );
    }
    setOpen(true);
  };
  const addNewConversion = () => {
    return append({
      barcode: null,
      unitId: units[0]?.id ?? null,
      conversionRate: 1,
      costPrice: 0,
      retailPrice: 0,
      wholesalePrice: 0,
      promoPrice: null,
    });
  };

  return (
    <>
      <TMButton type="button" size="sm" variant="outline" onClick={open}>
        Nâng cao
      </TMButton>
      <TMModal open={isOpen} close={() => setOpen(false)} width={720} title="Thông tin mã vạch">
        <div className="flex flex-col gap-2 scrollbar max-h-[60svh] overflow-y-scroll h-full">
          {fieldArrays?.map((fieldValues, fieldIndex) => {
            return (
              <div
                className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 bg-slate-100 rounded p-4"
                key={fieldValues.id}
              >
                <FormControl name={`${barcodeName}.${fieldIndex}.barcode`}>
                  <TextInput label="Barcode" />
                </FormControl>
                <FormControl name={`${barcodeName}.${fieldIndex}.unitId`}>
                  {(field) => (
                    <SelectInput
                      label="Đơn vị"
                      value={field.value}
                      options={units.map((unit) => ({ label: unit.name, value: unit.id }))}
                      onSelect={field.onChange}
                    />
                  )}
                </FormControl>
                <FormControl name={`${barcodeName}.${fieldIndex}.conversionRate`}>
                  {(field) => (
                    <NumberStepper
                      label="Quy đổi đơn vị"
                      value={field.value}
                      step={1}
                      disabled={Number(field.value) === 1}
                      onValueChange={(value) => field.onChange(value.value)}
                    />
                  )}
                </FormControl>
                <FormControl name={`${barcodeName}.${fieldIndex}.wholesalePrice`}>
                  {(field) => (
                    <NumberStepper
                      label="Giá bán sỉ"
                      value={field.value}
                      onValueChange={(value) => field.onChange(value.value)}
                    />
                  )}
                </FormControl>
                <FormControl name={`${barcodeName}.${fieldIndex}.promoPrice`}>
                  {(field) => (
                    <NumberStepper
                      label="Giá khuyến mãi"
                      value={field.value ?? undefined}
                      onValueChange={(value) => field.onChange(value.value)}
                    />
                  )}
                </FormControl>
              </div>
            );
          })}

          <TMButton type="button" onClick={addNewConversion}>
            Thêm quy đổi
          </TMButton>
        </div>
      </TMModal>
    </>
  );
};

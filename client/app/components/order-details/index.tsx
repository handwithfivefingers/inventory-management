import { forwardRef, useImperativeHandle } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { FormControl } from "../form/form-control";
import { TextInput } from "../form/text-input";
import { NumberInput } from "../form/number-input";
import { TMButton } from "../tm-button";
import { Icon } from "../icon";
import { OrderDetailSchema } from "~/constants/schema/order";
import { NumberStepper } from "../form/number-stepper";

export interface OrderDetailFunction {
  append: (value: Partial<OrderDetailSchema>) => void;
  replace: (value: OrderDetailSchema[]) => void;
}
interface Props {
  addProduct: () => void;
}
export const OrderDetails = forwardRef<OrderDetailFunction, Props>((props, ref) => {
  const form = useFormContext();
  if (!form) throw new Error("Component must be used within a FormProvider");
  const { fields, append, replace } = useFieldArray<any>({
    control: form.control, // control props comes from useForm (optional: if you are using FormProvider)
    name: "orderDetails", // unique name for your Field Array
  });
  // const orderDetails = form.watch("orderDetails") as OrderDetailSchema[];

  const onQuantityIncreasement = (field: any, pos: number) => {
    const quantity = form.getValues(`orderDetails.${pos}.quantity` as any);
    field.onChange(Number(quantity) + 1);
  };
  const onQuantityDecreasement = (field: any, pos: number) => {
    const quantity = form.getValues(`orderDetails.${pos}.quantity` as any);
    const lastQuantity = Number(quantity) > 0 ? Number(quantity) - 1 : 0;
    field.onChange(lastQuantity);
  };

  const onQuantityChange = ({ value, float }: any, field: any, pos: number) => {
    field.onChange(value);
    const price = form.getValues(`orderDetails.${pos}.price` as any);
    const v = Number(value) * Number(price);
    form.setValue(`orderDetails.${pos}.buyPrice` as any, v);
  };
  const onChangePrice = ({ value, float }: any, field: any, pos: number) => {
    field.onChange(value);
    const quantity = form.getValues(`orderDetails.${pos}.quantity` as any);
    const v = Number(value) * Number(quantity);
    form.setValue(`orderDetails.${pos}.buyPrice` as any, v);
  };

  useImperativeHandle(
    ref,
    () => ({
      append,
      replace,
    }),
    [],
  );

  return (
    <div className="min-h-40 max-h-[45vh] overflow-auto flex flex-col gap-4 py-2">
      {fields?.map((field, i: number) => {
        return (
          <div className="grid grid-cols-12" key={field.id}>
            <div className="col-span-12 grid grid-cols-12 gap-2 items-center" key={field.id}>
              <div className="hidden">
                <FormControl name={`orderDetails.${i}.productId`}>
                  <TextInput readOnly />
                </FormControl>
              </div>
              <div className="col-span-1 px-2">
                <div className="px-2">{i + 1}</div>
              </div>
              <div className="col-span-4 ">
                <FormControl name={`orderDetails.${i}.name`}>
                  <TextInput readOnly />
                </FormControl>
              </div>
              <div className="col-span-2">
                <FormControl name={`orderDetails.${i}.quantity`}>
                  {(field) => (
                    <NumberStepper value={field.value} onValueChange={(v) => onQuantityChange(v, field, i)} />
                  )}
                </FormControl>
              </div>
              <div className="col-span-2">
                <FormControl name={`orderDetails.${i}.price` as any}>
                  {(field) => {
                    return <NumberInput value={field.value as any} onValueChange={(v) => onChangePrice(v, field, i)} />;
                  }}
                </FormControl>
              </div>
              <div className="col-span-3 px-2 text-right">
                <FormControl name={`orderDetails.${i}.buyPrice` as any}>
                  <NumberInput displayType="text" />
                </FormControl>
              </div>
            </div>
          </div>
        );
      })}

      <div className="col-span-12 justify-items-center items-center">
        <div>
          <TMButton onClick={props.addProduct}>Thêm sản phẩm</TMButton>
        </div>
      </div>
    </div>
  );
});

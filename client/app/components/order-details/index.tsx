import { forwardRef, useImperativeHandle } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { OrderDetailSchema } from "~/constants/schema/order";
import { useTranslation } from "~/i18n";
import { FormControl } from "../form/form-control";
import { NumberInput } from "../form/number-input";
import { NumberStepper } from "../form/number-stepper";
import { TextInput } from "../form/text-input";
import { TMButton } from "../tm-button";
import { Icon } from "../icon";

export interface OrderDetailFunction {
  append: (value: Partial<OrderDetailSchema>) => void;
  replace: (value: OrderDetailSchema[]) => void;
  remove: (index: number) => void;
}
interface Props {
  addProduct: () => void;
}
export const OrderDetails = forwardRef<OrderDetailFunction, Props>((props, ref) => {
  const form = useFormContext();
  const { t } = useTranslation();
  const orderDetails = form.watch("orderDetails") as OrderDetailSchema[];
  if (!form) throw new Error("Component must be used within a FormProvider");
  const { fields, append, replace, remove } = useFieldArray<any>({
    control: form.control, // control props comes from useForm (optional: if you are using FormProvider)
    name: "orderDetails", // unique name for your Field Array
  });

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
      remove,
    }),
    [],
  );

  return (
    <div className="min-h-40 h-full overflow-auto flex flex-col gap-4 relative border border-indigo-50 rounded-md">
      <div className="flex-1 overflow-x-auto">
        <div className="min-w-[640px]">
        <div className="flex gap-2 items-center py-3 bg-indigo-50 px-2 text-primary">
          <div className="w-full text-sm font-medium">{t("importOrder.product")}</div>
          <div className="w-32 shrink-0 text-sm font-medium ">{t("importOrder.quantity")}</div>
          <div className="w-28 shrink-0 text-sm font-medium text-right">{t("importOrder.unitPrice")}</div>
          <div className="w-28 shrink-0 text-sm font-medium text-right">{t("importOrder.total")}</div>
          <div className="w-10 shrink-0" />
        </div>

        {fields?.map((field, i: number) => {
          return (
            <div
              className="flex gap-2 items-center order-row bg-white odd:bg-slate-50 p-2 border-b border-slate-100 hover:bg-slate-200/70 transition-all"
              key={field.id}
            >
              <div className="hidden">
                <FormControl name={`orderDetails.${i}.productId`}>
                  <TextInput readOnly />
                </FormControl>
              </div>
              <div className="w-full">
                <FormControl name={`orderDetails.${i}.name`}>
                  {/* <TextInput readOnly /> */}
                  {(field) => <span className="text-sm">{field.value}</span>}
                </FormControl>
              </div>
              <div className="w-32 shrink-0">
                <FormControl name={`orderDetails.${i}.quantity`}>
                  {(field) => (
                    <NumberStepper value={field.value} onValueChange={(v) => onQuantityChange(v, field, i)} />
                  )}
                </FormControl>
              </div>
              <div className="w-28 shrink-0">
                <FormControl name={`orderDetails.${i}.price` as any}>
                  {(field) => {
                    return <NumberInput value={field.value as any} onValueChange={(v) => onChangePrice(v, field, i)} />;
                  }}
                </FormControl>
              </div>
              <div className="w-28 shrink-0 text-right">
                <FormControl name={`orderDetails.${i}.buyPrice` as any}>
                  <NumberInput displayType="text" className="text-sm" />
                </FormControl>
              </div>
              <div className="w-10 shrink-0 flex justify-end">
                <TMButton variant="ghost" size="xs" htmlType="button" onClick={() => remove(i)} title="Xóa sản phẩm">
                  <Icon name="trash-2" fontSize={14} />
                </TMButton>
              </div>
            </div>
          );
        })}
        {fields.length !== 0 ? null : (
          <div className="flex flex-col h-full items-center justify-center border-primary/20 border-dashed hover:bg-slate-200 transition-all cursor-pointer p-2">
            {/* <span>Chưa có sản phẩm nào</span> */}
            {/* <div className="flex flex-col items-center justify-center py-8 "> */}
            <Icon name="server" className="text-indigo-900 dark:text-slate-200" />
            <p className="text-indigo-900 dark:text-slate-200">Chưa có sản phẩm nào</p>
            {/* </div> */}
          </div>
        )}
        {/* <div
          className="items-center border-primary/20 border-dashed hover:bg-slate-200 transition-all cursor-pointer p-2"
          onClick={props.addProduct}
        >
          <div className="flex text-sm gap-2 text-primary">
            <Icon name="plus" fontSize={16} />
            <span>Thêm sản phẩm</span>
          </div>
        </div> */}
        </div>
      </div>
      <div className="flex gap-2 items-center order-row mt-auto bg-indigo-50 p-2 text-sm rounded-b text-primary">
        <div className="w-full font-medium">{t("importOrder.total")}</div>
        <div className="shrink-0">
          <NumberInput
            displayType="text"
            value={orderDetails.reduce((total, item: any) => total + Number(item?.buyPrice), 0) as any}
          />
        </div>
      </div>
    </div>
  );
});

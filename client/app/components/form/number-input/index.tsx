import { NumericFormat } from "react-number-format";
import { ITextInput, TextInput } from "../text-input";
import { forwardRef } from "react";
export interface INumberInput extends ITextInput {
  thousandSeparator?: string;
  onValueChange?: (...arg: any) => any;
}
export const NumberInput = forwardRef<HTMLInputElement, INumberInput>(
  ({ thousandSeparator = ",", onValueChange, prefix, ...rest }, ref) => {
    const handleChange = (values: any, sourceInfor: any) => {
      console.log("values", values);
      console.log("sourceInfor", sourceInfor);
      if (onValueChange) onValueChange?.(values, sourceInfor);
    };
    return (
      <NumericFormat
        customInput={TextInput}
        thousandSeparator={thousandSeparator}
        {...(rest as any)}
        displayType="input"
        prefix={prefix}
        onValueChange={handleChange}
        ref={ref}
      />
    );
  }
);

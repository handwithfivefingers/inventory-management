import { NumericFormat } from "react-number-format";
import { ITextInput, TextInput } from "../text-input";
import { forwardRef } from "react";
export interface INumberInput extends ITextInput {
  thousandSeparator?: string;
  displayType?: string;
  onValueChange?: (...arg: any) => any;
}
export const NumberInput = forwardRef<HTMLInputElement, INumberInput>(
  ({ thousandSeparator = ",", onValueChange, displayType = "input", prefix, ...rest }, ref) => {
    const handleChange = (values: any, sourceInfor: any) => {
      if (onValueChange) onValueChange?.(values, sourceInfor);
    };
    return (
      <NumericFormat
        customInput={TextInput}
        thousandSeparator={thousandSeparator}
        {...(rest as any)}
        displayType={displayType}
        prefix={prefix}
        onValueChange={handleChange}
        ref={ref}
        style={{ textAlign: "right" }}
      />
    );
  }
);
